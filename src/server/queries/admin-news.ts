import 'server-only';

import { createServerSupabase } from '@/lib/supabase/server';
import { pickTranslation } from '@/server/queries/shared';
import type { Locale } from '@/lib/i18n/config';
import type { ContentStatus, LocaleCode } from '@/types/database.types';

export interface AdminNewsListItem {
  id: string;
  slug: string;
  title: string;
  status: ContentStatus;
  publishedAt: string | null;
  isFeatured: boolean;
  updatedAt: string;
  /** Which locales actually have a title — drives the coverage dots in the list. */
  translatedLocales: LocaleCode[];
}

export interface AdminNewsListResult {
  items: AdminNewsListItem[];
  total: number;
  page: number;
  pageCount: number;
}

interface ListRow {
  id: string;
  slug: string;
  status: ContentStatus;
  published_at: string | null;
  is_featured: boolean;
  updated_at: string;
  translations: { locale: LocaleCode; title: string }[] | null;
}

/**
 * Article list for the editor.
 *
 * Unlike the public query this returns drafts and archived rows — RLS grants
 * `can_manage_content()` a full view — and it never filters on `published_at`, because
 * a scheduled article is precisely what an editor needs to find.
 */
export async function listAdminNews(
  locale: Locale,
  { status, search, page = 1, perPage = 20 }: {
    status?: ContentStatus;
    search?: string;
    page?: number;
    perPage?: number;
  } = {},
): Promise<AdminNewsListResult> {
  const supabase = await createServerSupabase();
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const from = (safePage - 1) * perPage;

  let query = supabase
    .from('news')
    .select(
      'id, slug, status, published_at, is_featured, updated_at, translations:news_translations ( locale, title )',
      { count: 'exact' },
    )
    .order('updated_at', { ascending: false })
    .range(from, from + perPage - 1);

  if (status) query = query.eq('status', status);
  if (search?.trim()) {
    const term = search.replace(/[,()\\]/g, ' ').trim();
    if (term) query = query.ilike('slug', `%${term}%`);
  }

  const { data, error, count } = await query.returns<ListRow[]>();

  if (error) {
    console.warn(`[admin:news] ${error.message}`);
    return { items: [], total: 0, page: safePage, pageCount: 1 };
  }

  return {
    items: (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: pickTranslation(row.translations, locale)?.title ?? row.slug,
      status: row.status,
      publishedAt: row.published_at,
      isFeatured: row.is_featured,
      updatedAt: row.updated_at,
      translatedLocales: (row.translations ?? [])
        .filter((t) => t.title?.trim())
        .map((t) => t.locale),
    })),
    total: count ?? 0,
    page: safePage,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / perPage)),
  };
}

export interface AdminNewsRecord {
  id: string;
  slug: string;
  categoryId: string | null;
  coverPath: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  isFeatured: boolean;
  translations: Record<
    LocaleCode,
    { title: string; excerpt: string; body: string; seoTitle: string; seoDescription: string }
  >;
}

const EMPTY_TRANSLATION = { title: '', excerpt: '', body: '', seoTitle: '', seoDescription: '' };

/** One article with every translation, shaped for the edit form. */
export async function getAdminNews(id: string): Promise<AdminNewsRecord | null> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('news')
    .select(
      `id, slug, category_id, cover_path, status, published_at, is_featured,
       translations:news_translations ( locale, title, excerpt, body, seo_title, seo_description )`,
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.warn(`[admin:news-detail] ${error.message}`);
    return null;
  }

  const row = data as unknown as {
    id: string;
    slug: string;
    category_id: string | null;
    cover_path: string | null;
    status: ContentStatus;
    published_at: string | null;
    is_featured: boolean;
    translations:
      | {
          locale: LocaleCode;
          title: string;
          excerpt: string | null;
          body: string;
          seo_title: string | null;
          seo_description: string | null;
        }[]
      | null;
  };

  // The form binds a controlled input per locale, so every locale must be present —
  // a missing key would make React flip that field from uncontrolled to controlled.
  const translations = {
    uz: { ...EMPTY_TRANSLATION },
    ru: { ...EMPTY_TRANSLATION },
    en: { ...EMPTY_TRANSLATION },
  } as AdminNewsRecord['translations'];

  for (const t of row.translations ?? []) {
    translations[t.locale] = {
      title: t.title ?? '',
      excerpt: t.excerpt ?? '',
      body: t.body ?? '',
      seoTitle: t.seo_title ?? '',
      seoDescription: t.seo_description ?? '',
    };
  }

  return {
    id: row.id,
    slug: row.slug,
    categoryId: row.category_id,
    coverPath: row.cover_path,
    status: row.status,
    publishedAt: row.published_at,
    isFeatured: row.is_featured,
    translations,
  };
}

/** Category options for the editor's select. */
export async function listNewsCategoryOptions(
  locale: Locale,
): Promise<{ id: string; label: string }[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('news_categories')
    .select('id, slug, translations:news_category_translations ( locale, name )')
    .order('sort_order', { ascending: true });

  if (error) {
    console.warn(`[admin:news-categories] ${error.message}`);
    return [];
  }

  return (data ?? []).map((raw) => {
    const row = raw as unknown as {
      id: string;
      slug: string;
      translations: { locale: LocaleCode; name: string }[] | null;
    };
    return { id: row.id, label: pickTranslation(row.translations, locale)?.name ?? row.slug };
  });
}

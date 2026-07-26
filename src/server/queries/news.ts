import 'server-only';

import { cache } from 'react';

import type { Locale } from '@/lib/i18n/config';
import { createPublicSupabase } from '@/lib/supabase/public';
import { mediaUrl } from '@/lib/supabase/storage';
import type { CategoryOption, NewsArticle, NewsSummary } from '@/types/content';

import { cacheReference } from './cache';
import { pickTranslation, safeQuery } from './shared';

const SUMMARY_SELECT = `
  id, slug, cover_path, published_at, is_featured,
  translations:news_translations ( locale, title, excerpt )
` as const;

interface SummaryRow {
  id: string;
  slug: string;
  cover_path: string | null;
  published_at: string | null;
  is_featured: boolean;
  translations: { locale: 'uz' | 'ru' | 'en'; title: string; excerpt: string | null }[] | null;
}

function toSummary(row: SummaryRow, locale: Locale): NewsSummary | null {
  const t = pickTranslation(row.translations, locale);
  // An article with no translation in any locale has nothing to render — drop it
  // rather than showing a card with an empty headline.
  if (!t) return null;

  return {
    id: row.id,
    slug: row.slug,
    title: t.title,
    excerpt: t.excerpt,
    coverUrl: mediaUrl(row.cover_path),
    publishedAt: row.published_at,
    isFeatured: row.is_featured,
  };
}

/**
 * Latest published articles, newest first.
 *
 * `React.cache` memoises per request, so the home page's news section and the page's
 * `generateMetadata` can both call this and pay for one round trip.
 */
export const getLatestNews = cache(
  async (locale: Locale, limit = 3): Promise<NewsSummary[]> => {
    const supabase = createPublicSupabase();

    const rows = await safeQuery<SummaryRow[]>(
      'latest-news',
      () =>
        supabase
          .from('news')
          .select(SUMMARY_SELECT)
          .eq('status', 'published')
          // `published_at` can be in the future: an editor schedules an announcement and
          // it must stay invisible until then. RLS cannot express "now", so the window
          // is applied here and in every other published-content query.
          .lte('published_at', new Date().toISOString())
          .order('published_at', { ascending: false })
          .limit(limit)
          .returns<SummaryRow[]>(),
      [],
    );

    return rows.map((row) => toSummary(row, locale)).filter((item): item is NewsSummary => item !== null);
  },
);

// -----------------------------------------------------------------------------
// Listing page
// -----------------------------------------------------------------------------

export interface NewsPage {
  items: NewsSummary[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * One page of published articles, optionally filtered by category.
 *
 * Uses PostgREST's `count: 'exact'` so the total arrives with the rows instead of
 * costing a second query — the pager needs it to render at all.
 */
export const getNewsPage = cache(
  async (
    locale: Locale,
    { page = 1, perPage = 9, category }: { page?: number; perPage?: number; category?: string } = {},
  ): Promise<NewsPage> => {
    const supabase = createPublicSupabase();
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const from = (safePage - 1) * perPage;

    const result = await safeQuery<{ rows: SummaryRow[]; count: number }>(
      'news-page',
      async () => {
        let query = supabase
          .from('news')
          .select(SUMMARY_SELECT, { count: 'exact' })
          .eq('status', 'published')
          .lte('published_at', new Date().toISOString());

        if (category) {
          // Filter on the joined category's slug rather than requiring the caller to
          // resolve it to an id first.
          query = query.eq('category.slug', category);
        }

        const { data, error, count } = await query
          .order('published_at', { ascending: false })
          .range(from, from + perPage - 1)
          .returns<SummaryRow[]>();

        return { data: { rows: data ?? [], count: count ?? 0 }, error };
      },
      { rows: [], count: 0 },
    );

    return {
      items: result.rows
        .map((row) => toSummary(row, locale))
        .filter((item): item is NewsSummary => item !== null),
      total: result.count,
      page: safePage,
      pageCount: Math.max(1, Math.ceil(result.count / perPage)),
    };
  },
);

/** Category chips above the news list. */
export const getNewsCategories = cache(
  cacheReference(['news-categories'], async (locale: Locale): Promise<CategoryOption[]> => {
  const supabase = createPublicSupabase();

  interface CategoryRow {
    slug: string;
    translations: { locale: 'uz' | 'ru' | 'en'; name: string }[] | null;
  }

  const rows = await safeQuery<CategoryRow[]>(
    'news-categories',
    () =>
      supabase
        .from('news_categories')
        .select('slug, translations:news_category_translations ( locale, name )')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .returns<CategoryRow[]>(),
    [],
  );

    return rows.flatMap((row) => {
      const t = pickTranslation(row.translations, locale);
      return t ? [{ slug: row.slug, label: t.name }] : [];
    });
  }),
);

// -----------------------------------------------------------------------------
// Article page
// -----------------------------------------------------------------------------

const ARTICLE_SELECT = `
  id, slug, cover_path, published_at, is_featured,
  category:news_categories ( slug ),
  translations:news_translations ( locale, title, excerpt, body, seo_title, seo_description )
` as const;

interface ArticleRow extends SummaryRow {
  category: { slug: string } | null;
  translations:
    | {
        locale: 'uz' | 'ru' | 'en';
        title: string;
        excerpt: string | null;
        body: string;
        seo_title: string | null;
        seo_description: string | null;
      }[]
    | null;
}

/** A single published article, or `null` when the slug is unknown or unpublished. */
export const getNewsBySlug = cache(
  async (locale: Locale, slug: string): Promise<NewsArticle | null> => {
    const supabase = createPublicSupabase();

    const rows = await safeQuery<ArticleRow[]>(
      'news-by-slug',
      () =>
        supabase
          .from('news')
          .select(ARTICLE_SELECT)
          .eq('slug', slug)
          .eq('status', 'published')
          .lte('published_at', new Date().toISOString())
          .limit(1)
          .returns<ArticleRow[]>(),
      [],
    );

    const row = rows[0];
    if (!row) return null;

    const t = pickTranslation(row.translations, locale);
    if (!t) return null;

    return {
      id: row.id,
      slug: row.slug,
      title: t.title,
      excerpt: t.excerpt,
      body: t.body,
      seoTitle: t.seo_title,
      seoDescription: t.seo_description,
      categorySlug: row.category?.slug ?? null,
      coverUrl: mediaUrl(row.cover_path),
      publishedAt: row.published_at,
      isFeatured: row.is_featured,
    };
  },
);

/** Slugs for `generateStaticParams` on the article route. */
export const getAllNewsSlugs = cache(async (): Promise<string[]> => {
  const supabase = createPublicSupabase();

  const rows = await safeQuery<{ slug: string }[]>(
    'news-slugs',
    () =>
      supabase
        .from('news')
        .select('slug')
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
        .returns<{ slug: string }[]>(),
    [],
  );

  return rows.map((row) => row.slug);
});

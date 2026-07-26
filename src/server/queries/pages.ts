import 'server-only';

import { cache } from 'react';

import type { Locale } from '@/lib/i18n/config';
import { createPublicSupabase } from '@/lib/supabase/public';
import type { StaticPage } from '@/types/content';

import { pickTranslation, safeQuery } from './shared';

interface PageRowShape {
  slug: string;
  updated_at: string;
  translations:
    | {
        locale: 'uz' | 'ru' | 'en';
        title: string;
        body: string;
        seo_title: string | null;
        seo_description: string | null;
      }[]
    | null;
}

/**
 * An editor-managed page (`/p/privacy`, `/p/terms`, …).
 *
 * The body is HTML from the rich-text editor. It is sanitised on write, and sanitised
 * again at render — see ARCHITECTURE §6. Never pass it to `dangerouslySetInnerHTML`
 * without going through `sanitizeHtml` first.
 */
export const getPageBySlug = cache(
  async (locale: Locale, slug: string): Promise<StaticPage | null> => {
    const supabase = createPublicSupabase();

    const rows = await safeQuery<PageRowShape[]>(
      'page-by-slug',
      () =>
        supabase
          .from('pages')
          .select(
            `slug, updated_at,
             translations:page_translations ( locale, title, body, seo_title, seo_description )`,
          )
          .eq('slug', slug)
          .eq('status', 'published')
          .limit(1)
          .returns<PageRowShape[]>(),
      [],
    );

    const row = rows[0];
    if (!row) return null;

    const t = pickTranslation(row.translations, locale);
    if (!t) return null;

    return {
      slug: row.slug,
      title: t.title,
      body: t.body,
      seoTitle: t.seo_title,
      seoDescription: t.seo_description,
      updatedAt: row.updated_at,
    };
  },
);

/** Slugs for `generateStaticParams` and the sitemap. */
export const getAllPageSlugs = cache(async (): Promise<string[]> => {
  const supabase = createPublicSupabase();

  const rows = await safeQuery<{ slug: string }[]>(
    'page-slugs',
    () =>
      supabase.from('pages').select('slug').eq('status', 'published').returns<{ slug: string }[]>(),
    [],
  );

  return rows.map((row) => row.slug);
});

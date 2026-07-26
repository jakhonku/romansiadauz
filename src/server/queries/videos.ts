import 'server-only';

import { cache } from 'react';

import type { Locale } from '@/lib/i18n/config';
import { createPublicSupabase } from '@/lib/supabase/public';
import type { CategoryOption, VideoSummary } from '@/types/content';

import { cacheReference } from './cache';
import { pickTranslation, safeQuery } from './shared';

const VIDEO_SELECT = `
  id, youtube_id, duration_seconds, published_at, sort_order,
  category:video_categories ( slug ),
  translations:video_translations ( locale, title, description )
` as const;

interface VideoRowShape {
  id: string;
  youtube_id: string;
  duration_seconds: number | null;
  published_at: string | null;
  sort_order: number;
  category: { slug: string } | null;
  translations: { locale: 'uz' | 'ru' | 'en'; title: string; description: string | null }[] | null;
}

/**
 * Published videos, optionally narrowed to one category.
 *
 * Only the YouTube id is stored — never an embed URL. The id is validated by a CHECK
 * constraint (`^[A-Za-z0-9_-]{11}$`) in 0003, which means the iframe `src` this page
 * builds cannot be turned into an arbitrary URL by a compromised editor account.
 */
export const getVideos = cache(
  async (locale: Locale, category?: string): Promise<VideoSummary[]> => {
    const supabase = createPublicSupabase();

    const rows = await safeQuery<VideoRowShape[]>(
      'videos',
      () => {
        let query = supabase
          .from('videos')
          .select(VIDEO_SELECT)
          .eq('status', 'published');

        if (category) query = query.eq('category.slug', category);

        return query
          .order('published_at', { ascending: false, nullsFirst: false })
          .order('sort_order', { ascending: true })
          .returns<VideoRowShape[]>();
      },
      [],
    );

    return rows.flatMap((row) => {
      const t = pickTranslation(row.translations, locale);
      if (!t) return [];
      return [
        {
          id: row.id,
          youtubeId: row.youtube_id,
          title: t.title,
          description: t.description,
          categorySlug: row.category?.slug ?? null,
          durationSeconds: row.duration_seconds,
          publishedAt: row.published_at,
        },
      ];
    });
  },
);

/** Category chips above the video gallery. */
export const getVideoCategories = cache(
  cacheReference(['video-categories'], async (locale: Locale): Promise<CategoryOption[]> => {
  const supabase = createPublicSupabase();

  interface CategoryRow {
    slug: string;
    translations: { locale: 'uz' | 'ru' | 'en'; name: string }[] | null;
  }

  const rows = await safeQuery<CategoryRow[]>(
    'video-categories',
    () =>
      supabase
        .from('video_categories')
        .select('slug, translations:video_category_translations ( locale, name )')
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

import 'server-only';

import { cache } from 'react';

import type { Locale } from '@/lib/i18n/config';
import { createPublicSupabase } from '@/lib/supabase/public';
import { mediaUrl } from '@/lib/supabase/storage';
import type { PhotoSummary } from '@/types/content';

import { pickTranslation, safeQuery } from './shared';

const PHOTO_SELECT = `
  id, storage_path, width, height, blur_data_url, sort_order,
  album:albums!inner ( status ),
  translations:photo_translations ( locale, alt_text )
` as const;

interface PhotoRowShape {
  id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  blur_data_url: string | null;
  sort_order: number;
  translations: { locale: 'uz' | 'ru' | 'en'; alt_text: string }[] | null;
}

/**
 * A flat strip of recent photographs for the home-page gallery teaser.
 *
 * Joined `!inner` on albums so an unpublished album's photos cannot leak through: the
 * photo rows themselves carry no status, they inherit it from the album.
 *
 * A photo with no `alt_text` in any locale is dropped rather than rendered with an
 * empty `alt`. An empty alt tells a screen reader "this image is decorative", which is
 * a lie for festival photography — omitting the image is the more honest failure.
 */
export const getRecentPhotos = cache(
  async (locale: Locale, limit = 8): Promise<PhotoSummary[]> => {
    const supabase = createPublicSupabase();

    const rows = await safeQuery<PhotoRowShape[]>(
      'recent-photos',
      () =>
        supabase
          .from('photos')
          .select(PHOTO_SELECT)
          .eq('album.status', 'published')
          .order('created_at', { ascending: false })
          .order('sort_order', { ascending: true })
          .limit(limit)
          .returns<PhotoRowShape[]>(),
      [],
    );

    return rows.flatMap((row) => {
      const t = pickTranslation(row.translations, locale);
      const url = mediaUrl(row.storage_path);
      if (!t?.alt_text || !url) return [];
      return [
        {
          id: row.id,
          url,
          alt: t.alt_text,
          width: row.width,
          height: row.height,
          blurDataUrl: row.blur_data_url,
        },
      ];
    });
  },
);

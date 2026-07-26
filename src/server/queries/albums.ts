import 'server-only';

import { cache } from 'react';

import type { Locale } from '@/lib/i18n/config';
import { createPublicSupabase } from '@/lib/supabase/public';
import { mediaUrl } from '@/lib/supabase/storage';
import type { AlbumSummary, PhotoSummary } from '@/types/content';

import { pickTranslation, safeQuery } from './shared';

const ALBUM_SELECT = `
  id, slug, cover_path, event_date, sort_order,
  translations:album_translations ( locale, title, description ),
  photos:photos ( count )
` as const;

interface AlbumRowShape {
  id: string;
  slug: string;
  cover_path: string | null;
  event_date: string | null;
  sort_order: number;
  translations: { locale: 'uz' | 'ru' | 'en'; title: string; description: string | null }[] | null;
  /** PostgREST returns an aggregate embed as a one-element array. */
  photos: { count: number }[] | null;
}

function toAlbum(row: AlbumRowShape, locale: Locale): AlbumSummary | null {
  const t = pickTranslation(row.translations, locale);
  if (!t) return null;

  return {
    id: row.id,
    slug: row.slug,
    title: t.title,
    description: t.description,
    coverUrl: mediaUrl(row.cover_path),
    eventDate: row.event_date,
    photoCount: row.photos?.[0]?.count ?? 0,
  };
}

/** Published albums, newest event first. */
export const getAlbums = cache(async (locale: Locale): Promise<AlbumSummary[]> => {
  const supabase = createPublicSupabase();

  const rows = await safeQuery<AlbumRowShape[]>(
    'albums',
    () =>
      supabase
        .from('albums')
        .select(ALBUM_SELECT)
        .eq('status', 'published')
        .order('event_date', { ascending: false, nullsFirst: false })
        .order('sort_order', { ascending: true })
        .returns<AlbumRowShape[]>(),
    [],
  );

  return rows.flatMap((row) => {
    const album = toAlbum(row, locale);
    return album ? [album] : [];
  });
});

export interface AlbumDetail extends AlbumSummary {
  photos: PhotoSummary[];
}

/** One album with its photographs, or `null` if the slug is unknown or unpublished. */
export const getAlbumBySlug = cache(
  async (locale: Locale, slug: string): Promise<AlbumDetail | null> => {
    const supabase = createPublicSupabase();

    interface DetailRow extends Omit<AlbumRowShape, 'photos'> {
      photos:
        | {
            id: string;
            storage_path: string;
            width: number | null;
            height: number | null;
            blur_data_url: string | null;
            sort_order: number;
            translations: { locale: 'uz' | 'ru' | 'en'; alt_text: string }[] | null;
          }[]
        | null;
    }

    const rows = await safeQuery<DetailRow[]>(
      'album-by-slug',
      () =>
        supabase
          .from('albums')
          .select(
            `id, slug, cover_path, event_date, sort_order,
             translations:album_translations ( locale, title, description ),
             photos:photos (
               id, storage_path, width, height, blur_data_url, sort_order,
               translations:photo_translations ( locale, alt_text )
             )`,
          )
          .eq('slug', slug)
          .eq('status', 'published')
          .limit(1)
          .returns<DetailRow[]>(),
      [],
    );

    const row = rows[0];
    if (!row) return null;

    const t = pickTranslation(row.translations, locale);
    if (!t) return null;

    const photos = (row.photos ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((photo) => {
        const alt = pickTranslation(photo.translations, locale);
        const url = mediaUrl(photo.storage_path);
        // Same rule as the home teaser: no alt text means no image, because an empty
        // alt would claim to a screen reader that the photograph is decorative.
        if (!alt?.alt_text || !url) return [];
        return [
          {
            id: photo.id,
            url,
            alt: alt.alt_text,
            width: photo.width,
            height: photo.height,
            blurDataUrl: photo.blur_data_url,
          },
        ];
      });

    return {
      id: row.id,
      slug: row.slug,
      title: t.title,
      description: t.description,
      coverUrl: mediaUrl(row.cover_path),
      eventDate: row.event_date,
      photoCount: photos.length,
      photos,
    };
  },
);

/** Slugs for `generateStaticParams` on the album route. */
export const getAllAlbumSlugs = cache(async (): Promise<string[]> => {
  const supabase = createPublicSupabase();

  const rows = await safeQuery<{ slug: string }[]>(
    'album-slugs',
    () =>
      supabase
        .from('albums')
        .select('slug')
        .eq('status', 'published')
        .returns<{ slug: string }[]>(),
    [],
  );

  return rows.map((row) => row.slug);
});

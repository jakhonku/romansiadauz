import 'server-only';

import { createServerSupabase } from '@/lib/supabase/server';
import type { LocaleCode } from '@/types/database.types';

/**
 * The photographs inside one album, for the editor.
 *
 * Unlike the public read in `queries/albums.ts`, this returns *every* locale rather than
 * the best one: the panel edits all three, and a fallback would quietly present the
 * Russian alt text in the Uzbek box and then save it there.
 */

export interface AdminPhotoTranslation {
  altText: string;
  caption: string;
}

export interface AdminPhoto {
  id: string;
  storagePath: string;
  width: number | null;
  height: number | null;
  sortOrder: number;
  translations: Record<LocaleCode, AdminPhotoTranslation>;
}

interface Row {
  id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  sort_order: number;
  translations: { locale: LocaleCode; alt_text: string | null; caption: string | null }[] | null;
}

function blank(): Record<LocaleCode, AdminPhotoTranslation> {
  return {
    uz: { altText: '', caption: '' },
    ru: { altText: '', caption: '' },
    en: { altText: '', caption: '' },
  };
}

export async function listAlbumPhotos(albumId: string): Promise<AdminPhoto[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('photos')
    .select(
      `id, storage_path, width, height, sort_order,
       translations:photo_translations ( locale, alt_text, caption )`,
    )
    .eq('album_id', albumId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .returns<Row[]>();

  if (error) {
    console.warn('[admin:photos]', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    // Every locale must be present: the panel binds a controlled input per language, and
    // a missing key flips React from uncontrolled to controlled mid-edit.
    const translations = blank();
    for (const t of row.translations ?? []) {
      translations[t.locale] = { altText: t.alt_text ?? '', caption: t.caption ?? '' };
    }

    return {
      id: row.id,
      storagePath: row.storage_path,
      width: row.width,
      height: row.height,
      sortOrder: row.sort_order,
      translations,
    };
  });
}

'use server';

import { revalidatePath } from 'next/cache';

import { requirePermission } from '@/lib/auth/session';
import { locales } from '@/lib/i18n/config';
import { createServerSupabase } from '@/lib/supabase/server';
import { MEDIA_BUCKET } from '@/lib/supabase/storage';
import { syncTranslations } from '@/server/actions/translation-sync';
import type { LocaleCode } from '@/types/database.types';

/**
 * Photographs inside an album.
 *
 * The files themselves are already in the bucket by the time any of this runs — the
 * browser uploads straight to Storage (see `lib/supabase/upload.ts`) and hands the
 * object keys here. So these actions only ever move rows, which keeps them small and
 * keeps a 6 MB image out of a Server Action body.
 */

export type PhotoResult = { ok: true } | { ok: false; message?: string };

export interface NewPhoto {
  path: string;
  width: number | null;
  height: number | null;
}

export interface PhotoEdit {
  id: string;
  sortOrder: number;
  translations: Record<LocaleCode, { altText: string; caption: string }>;
}

/** An album's photographs surface on the album page, the gallery index and the home teaser. */
function revalidateAlbum(slug?: string | null) {
  revalidatePath('/[locale]', 'page');
  revalidatePath('/[locale]/gallery', 'page');
  revalidatePath('/[locale]/gallery/[slug]', 'page');
  if (slug) revalidatePath(`/[locale]/gallery/${slug}`, 'page');
}

async function albumSlug(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  albumId: string,
): Promise<string | null> {
  const { data } = await supabase.from('albums').select('slug').eq('id', albumId).maybeSingle();
  return data?.slug ?? null;
}

/**
 * File the uploaded objects as rows.
 *
 * `sort_order` continues from the end of the album so a second batch lands after the
 * first rather than interleaving with it at zero.
 */
export async function addAlbumPhotos(albumId: string, photos: NewPhoto[]): Promise<PhotoResult> {
  await requirePermission('content.manage');

  const rows = photos.filter((photo) => photo.path.trim());
  if (!rows.length) return { ok: true };

  const supabase = await createServerSupabase();

  const { data: last } = await supabase
    .from('photos')
    .select('sort_order')
    .eq('album_id', albumId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const start = (last?.sort_order ?? -1) + 1;

  const { error } = await supabase.from('photos').insert(
    rows.map((photo, index) => ({
      album_id: albumId,
      storage_path: photo.path.trim(),
      width: photo.width,
      height: photo.height,
      sort_order: start + index,
    })),
  );

  if (error) {
    console.error('[admin:photos-insert]', error.message);
    return { ok: false, message: error.message };
  }

  revalidateAlbum(await albumSlug(supabase, albumId));
  revalidatePath(`/admin/gallery/${albumId}`);
  return { ok: true };
}

/**
 * Save the order and the per-locale alt text of the photographs the editor touched.
 *
 * One action for the whole panel rather than one per row: reordering ten photographs is
 * one intent, and ten actions would leave the album half-reordered if the fourth failed.
 *
 * A locale with no alt text is not written. `alt_text` is `NOT NULL DEFAULT ''`, so an
 * empty row is storable — but the public gallery treats a photo with no alt text as one
 * it must not render, and an empty row would satisfy the fallback chain's `find` and
 * hide the photograph in that language even though another language describes it.
 */
export async function saveAlbumPhotos(albumId: string, photos: PhotoEdit[]): Promise<PhotoResult> {
  await requirePermission('content.manage');

  const supabase = await createServerSupabase();

  for (const photo of photos) {
    const { error } = await supabase
      .from('photos')
      .update({ sort_order: photo.sortOrder })
      // Scoped to the album as well as the id: the id comes from the browser, and this
      // is what stops a crafted request from reordering a photo in another album.
      .eq('id', photo.id)
      .eq('album_id', albumId);

    if (error) {
      console.error('[admin:photos-update]', error.message);
      return { ok: false, message: error.message };
    }

    const rows = locales
      .filter((locale) => photo.translations[locale]?.altText.trim())
      .map((locale) => ({
        locale,
        alt_text: photo.translations[locale]!.altText.trim(),
        caption: photo.translations[locale]!.caption.trim() || null,
      }));

    const syncError = await syncTranslations(
      supabase,
      'photo_translations',
      'photo_id',
      photo.id,
      rows,
    );

    if (syncError) return { ok: false, message: syncError };
  }

  revalidateAlbum(await albumSlug(supabase, albumId));
  revalidatePath(`/admin/gallery/${albumId}`);
  return { ok: true };
}

/**
 * Remove a photograph, file included.
 *
 * A gallery photo is the one case where deleting the object is unambiguous: the row owns
 * its file, nothing else points at it, and leaving it behind would grow the bucket with
 * images no page can reach. The object is removed *after* the row, and a failure there
 * is logged rather than returned — the editor's intent was to remove the photograph, and
 * it is gone; an orphaned file is a cleanup detail, not a failed operation.
 */
export async function deleteAlbumPhoto(albumId: string, photoId: string): Promise<PhotoResult> {
  await requirePermission('content.manage');

  const supabase = await createServerSupabase();

  const { data: photo } = await supabase
    .from('photos')
    .select('storage_path')
    .eq('id', photoId)
    .eq('album_id', albumId)
    .maybeSingle();

  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId)
    .eq('album_id', albumId);

  if (error) {
    console.error('[admin:photos-delete]', error.message);
    return { ok: false, message: error.message };
  }

  if (photo?.storage_path) {
    const { error: removeError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .remove([photo.storage_path]);
    if (removeError) console.warn('[admin:photos-delete-object]', removeError.message);
  }

  revalidateAlbum(await albumSlug(supabase, albumId));
  revalidatePath(`/admin/gallery/${albumId}`);
  return { ok: true };
}

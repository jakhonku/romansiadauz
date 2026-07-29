'use client';

import { createClient } from './client';
import { MEDIA_BUCKET, MEDIA_MAX_BYTES, MEDIA_MIME_TYPES, mediaObjectKey } from './storage';

/**
 * Browser → Storage, directly.
 *
 * The file never passes through the Next.js server. That is not only a round trip
 * saved: a Server Action body is capped at 1 MB by default, so routing a 6 MB press
 * photograph through one would fail with an error that reads like a bug rather than a
 * limit. The browser client carries the editor's own session, so `media_editor_write`
 * decides whether the upload is allowed — an editor uploads, a viewer cannot, and the
 * check happens in the database rather than in this file.
 */

export type UploadFailure = 'type' | 'size' | 'upload';

export type UploadResult =
  | { ok: true; path: string; width: number | null; height: number | null }
  | { ok: false; reason: UploadFailure };

function isAllowedType(type: string): boolean {
  return (MEDIA_MIME_TYPES as readonly string[]).includes(type);
}

/**
 * Intrinsic dimensions, read from the file before it is sent.
 *
 * `photos.width/height` exist so `<Image>` can reserve the right box and the gallery
 * never shifts as it loads. Reading them here is the only cheap place to do it — the
 * server would have to download the object back and decode it.
 *
 * Failure is not an error: a browser without `createImageBitmap`, or a file it cannot
 * decode, simply yields no dimensions and the gallery falls back to its aspect-ratio box.
 */
async function readDimensions(
  file: File,
): Promise<{ width: number | null; height: number | null }> {
  if (typeof createImageBitmap !== 'function') return { width: null, height: null };

  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return { width: null, height: null };
  }
}

/** Validate, upload, and report back the object key to store on the record. */
export async function uploadMedia(file: File, folder: string): Promise<UploadResult> {
  if (!isAllowedType(file.type)) return { ok: false, reason: 'type' };
  if (file.size > MEDIA_MAX_BYTES) return { ok: false, reason: 'size' };

  const path = mediaObjectKey(folder, file.name);
  const { width, height } = await readDimensions(file);

  const { error } = await createClient().storage.from(MEDIA_BUCKET).upload(path, file, {
    // The key carries a random suffix, so an object is never overwritten and may be
    // cached for a year.
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    console.error('[upload]', error.message);
    return { ok: false, reason: 'upload' };
  }

  return { ok: true, path, width, height };
}

/**
 * Remove an object. Best-effort by design: a record whose row is already gone must not
 * be resurrected because its file could not be deleted.
 */
export async function removeMedia(path: string): Promise<void> {
  if (!path || /^(https?:)?\/\//.test(path) || path.startsWith('/')) return;
  const { error } = await createClient().storage.from(MEDIA_BUCKET).remove([path]);
  if (error) console.warn('[upload:remove]', error.message);
}

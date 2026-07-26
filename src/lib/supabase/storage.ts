import { clientEnv } from '@/lib/env';

export const MEDIA_BUCKET = 'media';

/**
 * Resolve a path in the PUBLIC `media` bucket to a CDN URL.
 *
 * Built by string concatenation rather than `supabase.storage.getPublicUrl()` so it
 * can be called from Server Components without instantiating a client — the public
 * URL for a public bucket is a pure function of the path.
 */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
    return path;
  }
  const base = clientEnv.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${encodeURI(path)}`;
}

/*
 * There are deliberately no applicant-document helpers here. The application form
 * mirrors the official paper blank, which asks for no photograph, passport scan or
 * performance recording — so there is nothing to upload, no private bucket, and no
 * signed URLs to mint. See the header of `0004_registrations.sql`.
 */

/** Object key for editorial media, namespaced by entity so the bucket stays tidy. */
export function mediaObjectKey(entity: string, fileName: string): string {
  const extension = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : 'bin';
  const safeExtension = extension.replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
  const stem = fileName
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'file';
  // A random suffix prevents two editors uploading "photo.jpg" from colliding.
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${entity}/${stem}-${suffix}.${safeExtension}`;
}

import { clientEnv } from '@/lib/env';

export const MEDIA_BUCKET = 'media';

/**
 * These two mirror the bucket definition in `0008_storage.sql` exactly.
 *
 * The bucket is the authority — it rejects an oversized or wrong-typed object no matter
 * who asks. Repeating the limits here only lets the upload UI say *why* before spending
 * a round trip on a file the server was always going to refuse. Change one, change both.
 *
 * SVG is absent on purpose: it is an executable document and Supabase serves it inline.
 * The reasoning is written out at the top of the migration.
 */
export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;

export const MEDIA_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;

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

/** Bucket holding the PDF scores of the recommended repertoire. See `0012_scores_storage.sql`. */
export const SCORES_BUCKET = 'scores';

/**
 * CDN URL for a score.
 *
 * `download` asks Storage to send `Content-Disposition: attachment` with that file name,
 * which is what separates "open it in the browser's PDF viewer" from "save it" — the two
 * things the repertoire page offers side by side. The name is the one the score arrived
 * with, so a competitor who saves twenty of them can still tell them apart.
 */
export function scoreUrl(path: string, download?: string | null): string {
  const base = clientEnv.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
  const url = `${base}/storage/v1/object/public/${SCORES_BUCKET}/${encodeURI(path)}`;
  return download ? `${url}?download=${encodeURIComponent(download)}` : url;
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

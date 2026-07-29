import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * Copy for the media uploader, flattened out of the dictionary.
 *
 * The uploader is a Client Component and the dictionary is loaded on the server, so the
 * strings have to cross the boundary as plain data. This lives in its own module rather
 * than in the component file because a `'use client'` module cannot export a function a
 * Server Component may call — the settings page does exactly that.
 */
export interface MediaLabels {
  upload: string;
  replace: string;
  remove: string;
  uploading: string;
  dropHint: string;
  pathLabel: string;
  typeError: string;
  sizeError: string;
  uploadError: string;
  noImage: string;
}

export function mediaLabels(d: Dictionary): MediaLabels {
  const m = d.admin.media;
  return {
    upload: m.upload,
    replace: m.replace,
    remove: m.remove,
    uploading: m.uploading,
    dropHint: m.dropHint,
    pathLabel: m.pathLabel,
    typeError: m.typeError,
    sizeError: m.sizeError,
    uploadError: m.uploadError,
    noImage: m.noImage,
  };
}

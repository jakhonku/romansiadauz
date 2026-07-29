'use client';

import { AlertTriangle, CheckCircle2, ImagePlus, Loader2, Save, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { TranslationTabs, panelClass } from '@/components/layout/translation-tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { locales, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { interpolate } from '@/lib/i18n/format';
import { MEDIA_MIME_TYPES, mediaUrl } from '@/lib/supabase/storage';
import { uploadMedia } from '@/lib/supabase/upload';
import { cn } from '@/lib/utils/cn';
import {
  addAlbumPhotos,
  deleteAlbumPhoto,
  saveAlbumPhotos,
  type NewPhoto,
} from '@/server/actions/admin-photos';
import type { LocaleCode } from '@/types/database.types';

export interface AlbumPhotoValue {
  id: string;
  storagePath: string;
  width: number | null;
  height: number | null;
  sortOrder: number;
  translations: Record<LocaleCode, { altText: string; caption: string }>;
}

/** What the save action needs to see as changed. Order and text, nothing else. */
function fingerprint(photo: AlbumPhotoValue): string {
  return JSON.stringify([photo.sortOrder, photo.translations]);
}

function hasAnyAlt(photo: AlbumPhotoValue): boolean {
  return locales.some((locale) => photo.translations[locale].altText.trim());
}

/**
 * The photographs inside one album.
 *
 * Rendered underneath the album form rather than behind a `/photos` route: an album is
 * its pictures, and splitting "name the album" from "put pictures in it" across two
 * screens makes the second half easy to forget. It only appears once the album exists,
 * because a photo row needs an `album_id` to point at.
 *
 * Alt text is the load-bearing field here, not a nicety. `queries/albums.ts` refuses to
 * render a photograph that has none — an empty `alt` would tell a screen reader the
 * image is decorative, which for a festival photograph is a lie. So a photo without alt
 * text in any language is flagged in place, and the panel says why.
 */
export function AlbumPhotos({
  albumId,
  albumSlug,
  photos,
  dictionary,
}: {
  albumId: string;
  albumSlug: string;
  photos: AlbumPhotoValue[];
  dictionary: Dictionary;
}) {
  const router = useRouter();
  const d = dictionary;
  const g = d.admin.gallery;
  const c = d.admin.common;
  const m = d.admin.media;

  const [rows, setRows] = useState<AlbumPhotoValue[]>(photos);
  const [tab, setTab] = useState<Locale>('uz');
  const [status, setStatus] = useState<'idle' | 'saved' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const inputRef = useRef<HTMLInputElement>(null);
  const initial = useRef(new Map(photos.map((photo) => [photo.id, fingerprint(photo)])));

  /**
   * Take the server's list when the *set* of photographs changes — an upload or a
   * delete — and merge rather than replace. Two things would otherwise go wrong: a plain
   * effect on `photos` would fire on any unrelated refresh of the parent, and a
   * wholesale replace would discard alt text the editor typed for photo A while photo B
   * was uploading. Rows already on screen keep their edits; new ids arrive from the
   * server; deleted ones fall out because the server no longer lists them.
   */
  const signature = photos.map((photo) => photo.id).join(',');
  const lastSignature = useRef(signature);

  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;

    setRows((previous) => {
      const edited = new Map(previous.map((row) => [row.id, row]));
      return photos.map((photo) => edited.get(photo.id) ?? photo);
    });

    // Saved state for the ids we have not seen before; an unsaved edit stays dirty.
    const saved = new Map<string, string>();
    for (const photo of photos) {
      saved.set(photo.id, initial.current.get(photo.id) ?? fingerprint(photo));
    }
    initial.current = saved;
  }, [signature, photos]);

  function patch(id: string, patchRow: (photo: AlbumPhotoValue) => AlbumPhotoValue) {
    setStatus('idle');
    setRows((previous) => previous.map((photo) => (photo.id === id ? patchRow(photo) : photo)));
  }

  async function upload(files: FileList | null) {
    if (!files?.length || pending || progress) return;

    setError(null);
    setStatus('idle');

    const list = Array.from(files);
    setProgress({ done: 0, total: list.length });

    const uploaded: NewPhoto[] = [];
    let failed = 0;

    // Sequential, not `Promise.all`: a dozen parallel uploads of 8 MB photographs
    // saturate an office connection and make every one of them slower, and the counter
    // below would jump about rather than count.
    for (const [index, file] of list.entries()) {
      const result = await uploadMedia(file, `gallery/${albumSlug || albumId}`);
      if (result.ok) {
        uploaded.push({ path: result.path, width: result.width, height: result.height });
      } else {
        failed += 1;
      }
      setProgress({ done: index + 1, total: list.length });
    }

    setProgress(null);
    if (failed) setError(m.uploadError);
    if (!uploaded.length) return;

    startTransition(async () => {
      const result = await addAlbumPhotos(albumId, uploaded);
      if (result.ok) router.refresh();
      else setError(c.saveFailed);
    });
  }

  function save() {
    setError(null);

    const changed = rows.filter((photo) => initial.current.get(photo.id) !== fingerprint(photo));
    if (!changed.length) {
      setStatus('saved');
      return;
    }

    startTransition(async () => {
      // Only the three fields the action writes cross the wire; the thumbnail path and
      // dimensions are already stored and have no business in a save payload.
      const result = await saveAlbumPhotos(
        albumId,
        changed.map(({ id, sortOrder, translations }) => ({ id, sortOrder, translations })),
      );

      if (result.ok) {
        for (const photo of changed) initial.current.set(photo.id, fingerprint(photo));
        setStatus('saved');
      } else {
        setStatus('failed');
      }
    });
  }

  function remove(photo: AlbumPhotoValue) {
    if (!window.confirm(g.confirmDeletePhoto)) return;

    startTransition(async () => {
      const result = await deleteAlbumPhoto(albumId, photo.id);
      if (result.ok) {
        setRows((previous) => previous.filter((row) => row.id !== photo.id));
        router.refresh();
      } else {
        setStatus('failed');
      }
    });
  }

  const missingAlt = rows.filter((photo) => !hasAnyAlt(photo)).length;
  const busy = pending || progress !== null;

  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">
          {g.photos}
          <span className="ms-2 text-sm font-normal text-muted-foreground">{rows.length}</span>
        </h2>

        <div className="flex items-center gap-3">
          {progress ? (
            <span role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {interpolate(g.uploadProgress, progress)}
            </span>
          ) : null}

          <input
            ref={inputRef}
            type="file"
            multiple
            accept={MEDIA_MIME_TYPES.join(',')}
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              void upload(event.target.files);
              event.target.value = '';
            }}
          />

          <Button
            type="button"
            variant="subtle"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus />
            {g.uploadPhotos}
          </Button>
        </div>
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">
        {g.uploadHint} · {m.dropHint}
      </p>

      {/* `text-warning`, not `text-warning-foreground` — the latter is the colour for
          text *on* a solid warning fill (white in light mode) and would vanish against
          this 10% tint. */}
      {missingAlt ? (
        <p className="mt-4 flex items-start gap-2 rounded-md bg-warning/10 p-3 text-xs text-warning">
          <AlertTriangle className="mt-px size-4 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">{g.altMissing}</strong> · {g.altMissingHint}
          </span>
        </p>
      ) : null}

      {rows.length ? (
        <>
          <TranslationTabs
            className="mt-5"
            active={tab}
            onChange={setTab}
            // The dot means "every photograph is described in this language", which is
            // the question an editor is actually asking of the tab strip.
            filled={(locale) => rows.every((photo) => photo.translations[locale].altText.trim())}
            label={c.translations}
          />

          {locales.map((locale) => (
            <ul key={locale} role="tabpanel" className={panelClass(tab === locale, 'gap-3')}>
              {rows.map((photo) => (
                <li
                  key={photo.id}
                  className="flex flex-wrap items-start gap-4 rounded-md border border-border p-3"
                >
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {mediaUrl(photo.storagePath) ? (
                      <Image
                        src={mediaUrl(photo.storagePath)!}
                        alt=""
                        fill
                        unoptimized
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>

                  {/* `basis` rather than a hard `min-width`: 16rem beside the thumbnail
                      is wider than an admin column on a phone, which pushed the whole
                      panel sideways. The fields still claim the row from `sm` up. */}
                  <div className="flex min-w-0 flex-1 basis-[11rem] flex-col gap-2 sm:basis-[16rem]">
                    <Input
                      aria-label={`${g.altText} — ${locale}`}
                      placeholder={g.altText}
                      value={photo.translations[locale].altText}
                      onChange={(event) =>
                        patch(photo.id, (row) => ({
                          ...row,
                          translations: {
                            ...row.translations,
                            [locale]: {
                              ...row.translations[locale],
                              altText: event.target.value,
                            },
                          },
                        }))
                      }
                      className={cn('h-9 text-sm', !hasAnyAlt(photo) && 'border-warning')}
                    />

                    <Input
                      aria-label={`${g.caption} — ${locale}`}
                      placeholder={g.caption}
                      value={photo.translations[locale].caption}
                      onChange={(event) =>
                        patch(photo.id, (row) => ({
                          ...row,
                          translations: {
                            ...row.translations,
                            [locale]: {
                              ...row.translations[locale],
                              caption: event.target.value,
                            },
                          },
                        }))
                      }
                      className="h-9 text-sm"
                    />

                    <p className="break-all font-mono text-[0.6875rem] text-muted-foreground">
                      {photo.storagePath}
                      {photo.width && photo.height ? ` · ${photo.width}×${photo.height}` : ''}
                    </p>
                  </div>

                  {/* Order and delete travel together: split by a wrap, the bin ends up
                      alone on a line and reads as belonging to the next photograph. */}
                  <div className="ms-auto flex items-center gap-2">
                    <Input
                      type="number"
                      aria-label={c.sortOrder}
                      value={photo.sortOrder}
                      onChange={(event) =>
                        patch(photo.id, (row) => ({
                          ...row,
                          sortOrder: Number(event.target.value) || 0,
                        }))
                      }
                      className="h-9 w-20 text-sm"
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={g.deletePhoto}
                      title={g.deletePhoto}
                      disabled={busy}
                      onClick={() => remove(photo)}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ))}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" disabled={busy} onClick={save}>
              <Save />
              {pending ? d.admin.registrations.saving : d.common.save}
            </Button>

            {status === 'saved' ? (
              <span role="status" className="flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="size-4" />
                {c.saved}
              </span>
            ) : null}
            {status === 'failed' ? (
              <span role="alert" className="text-sm font-medium text-destructive">
                {c.saveFailed}
              </span>
            ) : null}
          </div>
        </>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">{g.noPhotos}</p>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}

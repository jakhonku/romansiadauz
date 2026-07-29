'use client';

import { ImageIcon, Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import type { MediaLabels } from '@/lib/admin/media-labels';
import { MEDIA_MIME_TYPES, mediaUrl } from '@/lib/supabase/storage';
import { uploadMedia, type UploadFailure } from '@/lib/supabase/upload';
import { cn } from '@/lib/utils/cn';

/**
 * Pick or drop an image, get back the object key.
 *
 * The value this control owns is a *storage path*, not a URL — that is what every
 * `*_path` column holds, and building the CDN URL from it is `mediaUrl`'s job. The path
 * stays visible and editable underneath the preview on purpose: records created before
 * this control existed carry hand-typed paths, and pasting a key of an object that is
 * already in the bucket is quicker than uploading a second copy of it.
 *
 * Removing clears the field; it does not delete the object. Two records may legitimately
 * point at the same key — a partner logo reused as an event cover, a path pasted from
 * another record — and a control that deletes files as a side effect of an edit would
 * blank out the other one. Bulk cleanup of orphans is a bucket-level chore, not this
 * control's business. The one place a delete *is* unambiguous is a gallery photograph,
 * whose row owns its file outright, and `deletePhoto` removes it there.
 *
 * The thumbnail is `unoptimized`. An admin thumbnail is seen by a handful of staff, so
 * putting it through the image optimiser buys nothing — and skipping it means the same
 * element can render a `blob:` preview during the upload and the CDN URL after it,
 * without the remote-pattern allowlist having an opinion about either.
 */
export function ImageUpload({
  id,
  label,
  value,
  onChange,
  folder,
  labels,
  hint,
  optionalLabel,
  placeholder,
  className,
}: {
  id: string;
  label: string;
  /** Storage object key, e.g. `judges/ilhom-a1b2c3.jpg`. */
  value: string;
  onChange: (path: string) => void;
  /** Bucket folder the object is filed under — usually the entity key. */
  folder: string;
  labels: MediaLabels;
  hint?: string;
  optionalLabel?: string;
  placeholder?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * The picked file, shown instantly so the editor is not watching an empty box while
   * six megabytes travel. `path` is the key it was stored under, or `''` while the
   * upload is still in flight; the preview is dropped once `value` moves off it, which
   * is what stops a stale thumbnail from surviving a hand-edit of the path below.
   */
  const [preview, setPreview] = useState<{ url: string; path: string } | null>(null);

  /**
   * An object URL is a live handle into the page's memory, not a string, and has to be
   * released by hand. The ref — rather than the state value — is what gets revoked: the
   * same URL is held across two state updates (in flight, then stored under its key),
   * and revoking on every state change would tear down the image still on screen.
   */
  const objectUrlRef = useRef<string | null>(null);

  function showPreview(url: string | null, path = '') {
    if (objectUrlRef.current && objectUrlRef.current !== url) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = url;
    setPreview(url ? { url, path } : null);
  }

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  const failureMessage: Record<UploadFailure, string> = {
    type: labels.typeError,
    size: labels.sizeError,
    upload: labels.uploadError,
  };

  async function accept(file: File | undefined) {
    if (!file || pending) return;

    setError(null);
    setPending(true);
    showPreview(URL.createObjectURL(file));

    const result = await uploadMedia(file, folder);
    setPending(false);

    if (!result.ok) {
      showPreview(null);
      setError(failureMessage[result.reason]);
      return;
    }

    showPreview(objectUrlRef.current, result.path);
    onChange(result.path);
  }

  const url = preview && (!preview.path || preview.path === value) ? preview.url : mediaUrl(value);
  const hintId = `${id}-hint`;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-medium leading-none" htmlFor={`${id}-path`}>
          {label}
        </label>
        {optionalLabel ? (
          <span className="text-xs text-muted-foreground">{optionalLabel}</span>
        ) : null}
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void accept(event.dataTransfer.files[0]);
        }}
        className={cn(
          'flex gap-4 rounded-md border border-dashed border-input p-3 transition-colors',
          dragging && 'border-primary bg-primary/5',
        )}
      >
        <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-muted">
          {url ? (
            <Image src={url} alt="" fill unoptimized sizes="96px" className="object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-muted-foreground/50">
              <ImageIcon className="size-6" aria-hidden />
              <span className="sr-only">{labels.noImage}</span>
            </span>
          )}

          {pending ? (
            <span className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={MEDIA_MIME_TYPES.join(',')}
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              void accept(event.target.files?.[0]);
              // Reset, so re-picking the same file after an error fires `change` again.
              event.target.value = '';
            }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="subtle"
              size="sm"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
            >
              <Upload />
              {pending ? labels.uploading : value ? labels.replace : labels.upload}
            </Button>

            {value && !pending ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
                <X />
                {labels.remove}
              </Button>
            ) : null}
          </div>

          <p id={hintId} className="text-xs leading-relaxed text-muted-foreground">
            {hint ?? labels.dropHint}
          </p>

          <Input
            id={`${id}-path`}
            aria-describedby={hintId}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder ?? `${folder}/…`}
            className="h-9 font-mono text-xs"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

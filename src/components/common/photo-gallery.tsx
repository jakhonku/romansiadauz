'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import { interpolate } from '@/lib/i18n/format';
import { cn } from '@/lib/utils/cn';
import type { PhotoSummary } from '@/types/content';

export interface LightboxLabels {
  next: string;
  previous: string;
  close: string;
  /** Template with `{current}` and `{total}`. */
  counter: string;
}

/**
 * Album grid with a lightbox.
 *
 * Each thumbnail is a real `<button>`, so the grid is keyboard-navigable before the
 * dialog ever opens. Inside the dialog, Radix handles the focus trap, scroll lock and
 * `Escape`; the arrow-key handler below is added on top because a photo viewer that
 * cannot be paged with the keyboard is not usable without a mouse.
 *
 * Only the open photo is mounted at full size — a fifty-image album must not put fifty
 * full-resolution requests on the wire.
 */
export function PhotoGallery({
  photos,
  labels,
  className,
}: {
  photos: PhotoSummary[];
  labels: LightboxLabels;
  className?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const step = useCallback(
    (delta: number) => {
      setOpenIndex((current) => {
        if (current === null) return current;
        // Wrap around: from the last photo, "next" returns to the first.
        return (current + delta + photos.length) % photos.length;
      });
    },
    [photos.length],
  );

  useEffect(() => {
    if (openIndex === null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIndex, step]);

  if (!photos.length) return null;

  const active = openIndex === null ? null : photos[openIndex];

  return (
    <>
      <ul className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4', className)}>
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group relative block aspect-square w-full overflow-hidden rounded-media bg-muted"
            >
              <Image
                src={photo.url}
                alt={photo.alt}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                placeholder={photo.blurDataUrl ? 'blur' : 'empty'}
                blurDataURL={photo.blurDataUrl ?? undefined}
                className="object-cover transition-transform duration-700 ease-luxe group-hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog.Root open={openIndex !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <Dialog.Content
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 focus:outline-none sm:p-10"
            aria-describedby={undefined}
          >
            {/* Radix requires an accessible name; the photo's own alt text is the most
                meaningful one available. */}
            <Dialog.Title className="sr-only">{active?.alt ?? ''}</Dialog.Title>

            {active ? (
              <div className="relative flex max-h-full w-full max-w-5xl flex-col items-center">
                <div className="relative h-[70vh] w-full">
                  <Image
                    key={active.id}
                    src={active.url}
                    alt={active.alt}
                    fill
                    sizes="(min-width: 1024px) 1024px, 100vw"
                    className="object-contain"
                    priority
                  />
                </div>

                <p className="mt-5 max-w-2xl text-center text-sm text-white/80">{active.alt}</p>
                <p className="mt-2 text-xs tabular-nums text-white/50">
                  {interpolate(labels.counter, {
                    current: (openIndex ?? 0) + 1,
                    total: photos.length,
                  })}
                </p>
              </div>
            ) : null}

            {photos.length > 1 ? (
              <>
                <LightboxButton
                  onClick={() => step(-1)}
                  label={labels.previous}
                  className="start-3 sm:start-6"
                >
                  <ChevronLeft className="size-6 rtl:rotate-180" />
                </LightboxButton>
                <LightboxButton
                  onClick={() => step(1)}
                  label={labels.next}
                  className="end-3 sm:end-6"
                >
                  <ChevronRight className="size-6 rtl:rotate-180" />
                </LightboxButton>
              </>
            ) : null}

            <Dialog.Close
              className="absolute end-3 top-3 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:end-6 sm:top-6"
              aria-label={labels.close}
            >
              <X className="size-5" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function LightboxButton({
  onClick,
  label,
  className,
  children,
}: {
  onClick: () => void;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'absolute top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full',
        'bg-white/10 text-white transition-colors hover:bg-white/20',
        className,
      )}
    >
      {children}
    </button>
  );
}

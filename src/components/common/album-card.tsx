import { ImageOff, Images } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { formatDate } from '@/lib/i18n/format';
import { localizeHref, type Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils/cn';
import type { AlbumSummary } from '@/types/content';

export function AlbumCard({
  album,
  locale,
  photosLabel,
  className,
}: {
  album: AlbumSummary;
  locale: Locale;
  /** Localized noun for the photo count, e.g. "foto". */
  photosLabel: string;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-card border border-border bg-card shadow-card',
        'transition-all duration-500 ease-luxe hover:-translate-y-1 hover:shadow-lift',
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {album.coverUrl ? (
          <Image
            src={album.coverUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-luxe group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center">
            <ImageOff className="size-7 text-muted-foreground/40" aria-hidden />
          </div>
        )}

        <span className="absolute end-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-medium backdrop-blur">
          <Images className="size-3.5 text-gold" aria-hidden />
          {album.photoCount} {photosLabel}
        </span>
      </div>

      <div className="p-5">
        {album.eventDate ? (
          <time
            dateTime={album.eventDate}
            className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-gold-ink"
          >
            {formatDate(album.eventDate, locale)}
          </time>
        ) : null}

        <h3 className="mt-2 font-display text-lg font-semibold leading-snug">
          <Link
            href={localizeHref(`/gallery/${album.slug}`, locale)}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {album.title}
          </Link>
        </h3>

        {album.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{album.description}</p>
        ) : null}
      </div>
    </article>
  );
}

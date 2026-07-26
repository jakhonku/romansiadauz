import { ArrowUpRight, ImageOff } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { formatDate } from '@/lib/i18n/format';
import { localizeHref, type Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils/cn';
import type { NewsSummary } from '@/types/content';

/**
 * Article teaser.
 *
 * The whole card is one link with a stretched pseudo-element rather than separate
 * links on the image and the headline: duplicate links to the same destination are
 * noise for a screen-reader user tabbing through a grid, and a single large target is
 * easier to hit on touch.
 */
export function NewsCard({
  item,
  locale,
  className,
  priority = false,
}: {
  item: NewsSummary;
  locale: Locale;
  className?: string;
  /** Set on the first card above the fold so it is not lazy-loaded. */
  priority?: boolean;
}) {
  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-card border border-border bg-card',
        'shadow-card transition-all duration-500 ease-luxe hover:-translate-y-1 hover:shadow-lift',
        className,
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {item.coverUrl ? (
          <Image
            src={item.coverUrl}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-luxe group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center">
            <ImageOff className="size-7 text-muted-foreground/40" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        {item.publishedAt ? (
          <time
            dateTime={item.publishedAt}
            className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-gold-ink"
          >
            {formatDate(item.publishedAt, locale)}
          </time>
        ) : null}

        <h3 className="mt-3 font-display text-xl font-semibold leading-snug">
          <Link
            href={localizeHref(`/news/${item.slug}`, locale)}
            // `after:absolute inset-0` turns the card into the click target while
            // keeping exactly one link in the accessibility tree.
            className="after:absolute after:inset-0 after:content-['']"
          >
            {item.title}
          </Link>
        </h3>

        {item.excerpt ? (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {item.excerpt}
          </p>
        ) : null}

        <ArrowUpRight
          aria-hidden
          className="mt-auto size-5 translate-y-2 pt-4 text-gold opacity-0 transition-all duration-500 ease-luxe group-hover:translate-y-0 group-hover:opacity-100"
        />
      </div>
    </article>
  );
}

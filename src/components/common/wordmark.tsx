import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

/**
 * The Romansiada Uzbekistan lockup: the 2026 emblem beside the name.
 *
 * The name is live text rather than part of the image. The emblem is a tall portrait
 * mark — at the 36–64px the header and footer give it, its own engraved «Романсиада
 * 2026» lettering is a few pixels high and unreadable, so the legible half of the
 * lockup has to be set in the page. That also keeps it crisp on every display, lets it
 * follow the dark theme, and leaves it selectable and searchable.
 */
export function Wordmark({
  name = 'Romansiada',
  region = 'Uzbekistan',
  size = 'md',
  className,
}: {
  name?: string;
  region?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Retained for call sites that still pass it; the mark is a raster image now. */
  gradientId?: string;
}) {
  /*
    Mark heights are arbitrary values, deliberately, and must stay that way.

    Tailwind's spacing scale has no 13, 15, 17 or 18 — it steps 12, 14, 16, 20 — so
    `h-15` and `h-18` compile to nothing at all. That failure is silent: with no height
    rule the mark falls back to its intrinsic 377x480 and rendered 240px tall, four
    times the header, spilling over the hero headline. A rem value written out cannot
    fail that way.

    The header bar is 5rem tall (`spacing.header`), which is what caps `md` at
    3.25rem: enough presence to read as a lockup, with room left above and below.
  */
  const scale = {
    sm: {
      mark: 'h-[2.5rem] sm:h-[2.75rem]',
      name: 'text-lg sm:text-xl',
      region: 'text-[0.5625rem] sm:text-[0.625rem]',
    },
    md: {
      mark: 'h-[3rem] sm:h-[3.25rem]',
      name: 'text-xl sm:text-2xl',
      region: 'text-[0.625rem] sm:text-[0.6875rem]',
    },
    lg: {
      mark: 'h-[4rem] sm:h-[5rem] md:h-[5.25rem]',
      name: 'text-2xl sm:text-3xl md:text-[2rem]',
      region: 'text-[0.6875rem] sm:text-[0.75rem]',
    },
  }[size];

  return (
    <span className={cn('group inline-flex shrink-0 items-center gap-2.5 sm:gap-3', className)}>
      <Image
        src="/images/logo-2026.webp"
        alt={`${name} ${region}`}
        width={377}
        height={480}
        className={cn(
          'w-auto object-contain transition-transform duration-500 ease-luxe group-hover:scale-105',
          'dark:drop-shadow-[0_1px_8px_rgba(255,215,0,0.25)]',
          scale.mark,
        )}
        priority
      />

      <span className="flex flex-col justify-center leading-none">
        <span
          className={cn(
            'font-display font-bold uppercase leading-none tracking-[0.06em] text-primary',
            scale.name,
          )}
        >
          {name}
        </span>
        {/*
          A hairline each side of the region, as on the printed lockup. `gold-ink` and
          not `gold`: this is 8–11px text, and the decorative gold fails contrast at
          that size — see the note on the colour in the Tailwind config.
        */}
        <span
          className={cn(
            'mt-1 flex items-center gap-1.5 font-semibold uppercase leading-none tracking-[0.3em] text-gold-ink',
            scale.region,
          )}
        >
          <span aria-hidden className="h-px w-2.5 bg-gold/60 sm:w-3.5" />
          {region}
          <span aria-hidden className="h-px w-2.5 bg-gold/60 sm:w-3.5" />
        </span>
      </span>
    </span>
  );
}

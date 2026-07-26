import { UserRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { localizeHref, type Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils/cn';
import type { JudgeSummary } from '@/types/content';

/**
 * Jury member portrait card.
 *
 * The name sits on a gradient scrim over the lower third of the photograph rather than
 * in a caption bar below it. Portraits vary wildly in crop and background, and a scrim
 * is the only treatment that keeps white text legible across all of them.
 */
export function JudgeCard({
  judge,
  locale,
  chairLabel,
  className,
}: {
  judge: JudgeSummary;
  locale: Locale;
  /** Localized "Chair of the jury" — passed in so this stays a dumb component. */
  chairLabel: string;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-card border border-border bg-muted shadow-card',
        'transition-all duration-500 ease-luxe hover:-translate-y-1 hover:shadow-lift',
        className,
      )}
    >
      <div className="relative aspect-[3/4]">
        {judge.photoUrl ? (
          <Image
            src={judge.photoUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-luxe group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center">
            <UserRound className="size-10 text-muted-foreground/40" aria-hidden />
          </div>
        )}

        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/45 to-transparent"
        />

        {judge.isChair ? (
          <Badge variant="gold" className="absolute end-3 top-3 bg-background/90 backdrop-blur">
            {chairLabel}
          </Badge>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 p-5">
          <h3 className="font-display text-lg font-semibold leading-snug text-white">
            <Link
              href={localizeHref(`/judges#${judge.slug}`, locale)}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {judge.fullName}
            </Link>
          </h3>
          {judge.roleTitle ? (
            <p className="mt-1 text-xs leading-snug text-white/75">{judge.roleTitle}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

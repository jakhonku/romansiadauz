import { Award, Trophy, UserRound } from 'lucide-react';
import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import type { WinnerSummary } from '@/types/content';

export interface WinnerLabels {
  /** Ordinal noun, e.g. "o'rin" — rendered as "1 o'rin". */
  place: string;
  grandPrix: string;
  award: string;
}

export function WinnerCard({
  winner,
  labels,
  className,
}: {
  winner: WinnerSummary;
  labels: WinnerLabels;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'group flex gap-5 rounded-card border border-border bg-card p-5 shadow-card',
        'transition-all duration-500 ease-luxe hover:-translate-y-0.5 hover:shadow-lift',
        winner.isGrandPrix && 'border-gold/60',
        className,
      )}
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-muted">
        {winner.photoUrl ? (
          <Image
            src={winner.photoUrl}
            alt=""
            fill
            sizes="80px"
            className="object-cover transition-transform duration-700 ease-luxe group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center">
            <UserRound className="size-7 text-muted-foreground/40" aria-hidden />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {winner.isGrandPrix ? (
            <Badge variant="gold">
              <Trophy aria-hidden />
              {labels.grandPrix}
            </Badge>
          ) : winner.place ? (
            <Badge variant="default">
              {winner.place} {labels.place}
            </Badge>
          ) : (
            <Badge variant="muted">
              <Award aria-hidden />
              {labels.award}
            </Badge>
          )}
          <span className="text-xs font-semibold tracking-[0.12em] text-muted-foreground">
            {winner.year}
          </span>
        </div>

        <h3 className="mt-3 font-display text-lg font-semibold leading-snug">{winner.fullName}</h3>
        {winner.awardTitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{winner.awardTitle}</p>
        ) : null}
      </div>
    </article>
  );
}

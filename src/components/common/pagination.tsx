import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils/cn';

/**
 * Page navigation for the news list.
 *
 * Long runs are elided to `1 … 4 5 6 … 20`, always keeping the first, last, current and
 * its immediate neighbours. Disabled prev/next render as `<span>` rather than a link
 * with `aria-disabled`: a disabled link is still focusable and still navigable, which
 * is exactly the trap the disabled state is meant to prevent.
 */
export function Pagination({
  page,
  pageCount,
  buildHref,
  labels,
  className,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
  labels: { previous: string; next: string; page: string };
  className?: string;
}) {
  if (pageCount <= 1) return null;

  const numbers = pageRange(page, pageCount);

  return (
    <nav aria-label={labels.page} className={cn('flex items-center justify-center gap-1.5', className)}>
      <Step href={page > 1 ? buildHref(page - 1) : null} label={labels.previous}>
        <ChevronLeft className="size-4 rtl:rotate-180" />
      </Step>

      {numbers.map((entry, index) =>
        entry === 'gap' ? (
          <span key={`gap-${index}`} aria-hidden className="px-1 text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={buildHref(entry)}
            aria-current={entry === page ? 'page' : undefined}
            aria-label={`${labels.page} ${entry}`}
            className={cn(
              'grid size-10 place-items-center rounded-md border text-sm font-medium transition-colors',
              entry === page
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-gold hover:text-foreground',
            )}
          >
            {entry}
          </Link>
        ),
      )}

      <Step href={page < pageCount ? buildHref(page + 1) : null} label={labels.next}>
        <ChevronRight className="size-4 rtl:rotate-180" />
      </Step>
    </nav>
  );
}

function Step({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: React.ReactNode;
}) {
  const shared = 'grid size-10 place-items-center rounded-md border border-border';

  if (!href) {
    return (
      <span className={cn(shared, 'text-muted-foreground/40')} aria-hidden>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(shared, 'text-muted-foreground transition-colors hover:border-gold hover:text-foreground')}
    >
      {children}
    </Link>
  );
}

/** `[1, 'gap', 4, 5, 6, 'gap', 20]` — first, last, current ±1, gaps for the rest. */
function pageRange(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const keep = new Set([1, pageCount, page, page - 1, page + 1]);
  const out: (number | 'gap')[] = [];

  for (let n = 1; n <= pageCount; n += 1) {
    if (keep.has(n)) {
      out.push(n);
    } else if (out[out.length - 1] !== 'gap') {
      out.push('gap');
    }
  }

  return out;
}

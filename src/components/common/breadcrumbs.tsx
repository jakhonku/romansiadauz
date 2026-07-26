import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils/cn';

export interface Crumb {
  label: string;
  /** Omit on the final crumb — the current page is not a link. */
  href?: string;
}

/**
 * Breadcrumb trail.
 *
 * Renders as an ordered list inside a labelled `<nav>`, and marks the last item with
 * `aria-current="page"` instead of linking it. The matching `BreadcrumbList` JSON-LD is
 * emitted separately by the page's metadata, so the structured data and the visible
 * trail come from the same array.
 */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.href ?? item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? (
                <ChevronRight aria-hidden className="size-3.5 shrink-0 opacity-50 rtl:rotate-180" />
              ) : null}
              {item.href && !isLast ? (
                <Link href={item.href} className="transition-colors hover:text-foreground">
                  {item.label}
                </Link>
              ) : (
                <span className={cn(isLast && 'text-foreground')} aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import Link from 'next/link';

import { cn } from '@/lib/utils/cn';

export interface ChipOption {
  /** `null` is the "all" chip. */
  value: string | null;
  label: string;
}

/**
 * Category filter above a list.
 *
 * Real links carrying a query string, not client-side state: a filtered view is a
 * distinct thing a visitor may want to bookmark, share or reach with the back button,
 * and links give all three for free while keeping the list a Server Component.
 */
export function FilterChips({
  options,
  active,
  buildHref,
  className,
  label,
}: {
  options: ChipOption[];
  active: string | null;
  buildHref: (value: string | null) => string;
  className?: string;
  /** Accessible name for the group, e.g. "Bo'limlar". */
  label: string;
}) {
  if (options.length <= 1) return null;

  return (
    <nav aria-label={label} className={cn('flex flex-wrap justify-center gap-2', className)}>
      {options.map((option) => {
        const isActive = option.value === active;
        return (
          <Link
            key={option.value ?? '__all'}
            href={buildHref(option.value)}
            aria-current={isActive ? 'true' : undefined}
            scroll={false}
            className={cn(
              'rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em]',
              'transition-colors duration-300',
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-gold hover:text-foreground',
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}

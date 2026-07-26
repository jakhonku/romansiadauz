import { cn } from '@/lib/utils/cn';

/**
 * Admin data table.
 *
 * The wrapper scrolls horizontally rather than letting the table squeeze: an
 * application list has six or seven meaningful columns, and on a phone the honest
 * options are "scroll sideways" or "hide data". Squeezing produces one-word-per-line
 * cells that are unreadable either way.
 *
 * `tabIndex={0}` on the scroll container is required, not decorative — a region that
 * scrolls must be reachable by keyboard, or a keyboard user cannot see the right-hand
 * columns at all.
 */
export function TableScroll({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  /** Accessible name for the scrollable region. */
  label: string;
  className?: string;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn(
        'overflow-x-auto rounded-card border border-border bg-card',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full min-w-[44rem] border-collapse text-sm', className)} {...props} />;
}

export function Thead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-border bg-muted/50', className)} {...props} />;
}

export function Tbody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-border', className)} {...props} />;
}

export function Tr({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('transition-colors hover:bg-accent/50', className)} {...props} />;
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-4 py-3 text-start text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 align-middle', className)} {...props} />;
}

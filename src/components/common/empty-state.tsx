import { cn } from '@/lib/utils/cn';

/**
 * Placeholder shown when a published-content list comes back empty.
 *
 * Every public section renders this rather than collapsing to nothing. Before the
 * festival's first season — and any time the database is briefly unreachable — the page
 * still has to read as a finished site, not a broken one.
 */
export function EmptyState({
  message,
  icon: Icon,
  className,
  children,
}: {
  message: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-card border border-dashed border-border',
        'bg-surface/60 px-6 py-16 text-center',
        className,
      )}
    >
      {Icon ? <Icon className="size-8 text-gold/60" /> : null}
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {children}
    </div>
  );
}

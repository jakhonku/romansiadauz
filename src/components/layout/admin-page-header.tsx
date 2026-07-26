import { cn } from '@/lib/utils/cn';

/** Consistent masthead for every admin screen: title, optional count, right-hand actions. */
export function AdminPageHeader({
  title,
  description,
  count,
  actions,
  className,
}: {
  title: string;
  description?: string;
  /** Rendered beside the title, e.g. the number of matching rows. */
  count?: number;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-display-sm font-semibold">{title}</h1>
          {typeof count === 'number' ? (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
              {count}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

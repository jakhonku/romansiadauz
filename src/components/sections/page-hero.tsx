import { Reveal } from '@/components/motion/reveal';
import { Breadcrumbs, type Crumb } from '@/components/common/breadcrumbs';
import { cn } from '@/lib/utils/cn';

/**
 * Masthead for every inner page.
 *
 * Carries the `pt-header` offset that clears the fixed header. Only the home page's
 * full-bleed hero opts out of this — every other route starts here, so the offset lives
 * in one place instead of being re-declared per page.
 */
export function PageHero({
  kicker,
  title,
  subtitle,
  crumbs,
  className,
  children,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'relative overflow-hidden border-b border-border bg-surface',
        'pb-14 pt-[calc(theme(spacing.header)+3.5rem)]',
        className,
      )}
    >
      {/* Faint gold wash bleeding in from the top-right corner. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -end-24 -top-32 size-[26rem] rounded-full bg-gold/10 blur-3xl"
      />

      <div className="container relative">
        {crumbs?.length ? <Breadcrumbs items={crumbs} className="mb-6" /> : null}

        <Reveal className="max-w-3xl">
          {kicker ? (
            <span className="kicker flex items-center gap-3">
              <span aria-hidden className="h-px w-8 bg-gold" />
              {kicker}
            </span>
          ) : null}
          <h1 className={cn('text-display-xl font-semibold', kicker ? 'mt-4' : undefined)}>{title}</h1>
          {subtitle ? (
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{subtitle}</p>
          ) : null}
          {children ? <div className="mt-8">{children}</div> : null}
        </Reveal>
      </div>
    </section>
  );
}

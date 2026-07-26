import { Reveal } from '@/components/motion/reveal';
import { cn } from '@/lib/utils/cn';

/**
 * The kicker / title / subtitle block that opens every section.
 *
 * Centralised so the vertical rhythm between the three lines — and the gold rule under
 * the kicker — is identical on all fourteen public pages.
 */
export function SectionHeading({
  kicker,
  title,
  subtitle,
  align = 'center',
  as: Tag = 'h2',
  className,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'start';
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        'flex max-w-3xl flex-col',
        align === 'center' ? 'mx-auto items-center text-center' : 'items-start text-start',
        className,
      )}
    >
      {kicker ? (
        <span className="kicker flex items-center gap-3">
          <span aria-hidden className="h-px w-8 bg-gold" />
          {kicker}
        </span>
      ) : null}

      <Tag
        className={cn(
          'text-display-lg font-semibold text-foreground',
          kicker ? 'mt-4' : undefined,
        )}
      >
        {title}
      </Tag>

      {subtitle ? (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{subtitle}</p>
      ) : null}
    </Reveal>
  );
}

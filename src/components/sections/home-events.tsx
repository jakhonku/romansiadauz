import { CalendarDays, MapPin } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { SectionHeading } from '@/components/sections/section-heading';
import { formatDate } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { EventSummary } from '@/types/content';

/**
 * Festival calendar strip.
 *
 * Each entry leads with a date block rather than a title, because visitors arriving at
 * this section are scanning for *when*, not *what* — the stage names ("regional round",
 * "gala") mean little until you know whether you have missed them.
 */
export function HomeEvents({
  locale,
  dictionary,
  items,
}: {
  locale: Locale;
  dictionary: Dictionary;
  items: EventSummary[];
}) {
  const e = dictionary.home.events;

  return (
    <section className="section-sm bg-background">
      <div className="container">
        <SectionHeading kicker={e.kicker} title={e.title} subtitle={e.subtitle} align="start" />

        {items.length ? (
          <Stagger className="mt-12 flex flex-col divide-y divide-border border-y border-border">
            {items.map((item) => (
              <StaggerItem key={item.id}>
                <article className="group flex flex-col gap-4 py-7 sm:flex-row sm:items-center sm:gap-8">
                  <DateBlock startsAt={item.startsAt} locale={locale} />

                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-xl font-semibold leading-snug">{item.title}</h3>
                    {item.description ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                  </div>

                  {item.location ? (
                    <p className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="size-4 text-gold" aria-hidden />
                      {item.location}
                    </p>
                  ) : null}
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <EmptyState className="mt-10" message={e.empty} icon={CalendarDays} />
        )}
      </div>
    </section>
  );
}

/** Day-over-month plate. Rendered from one `<time>` so the machine-readable date is intact. */
function DateBlock({ startsAt, locale }: { startsAt: string; locale: Locale }) {
  const day = formatDate(startsAt, locale, { day: '2-digit' });
  const month = formatDate(startsAt, locale, { month: 'short' });
  const year = formatDate(startsAt, locale, { year: 'numeric' });

  return (
    <time
      dateTime={startsAt}
      className="flex size-20 shrink-0 flex-col items-center justify-center rounded-media border border-gold/40 bg-surface leading-none transition-colors duration-500 group-hover:border-gold"
    >
      <span className="font-display text-2xl font-bold text-primary">{day}</span>
      <span className="mt-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-gold-ink">
        {month}
      </span>
      <span className="mt-1 text-[0.625rem] text-muted-foreground">{year}</span>
    </time>
  );
}

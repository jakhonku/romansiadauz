import { Trophy } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EmptyState } from '@/components/common/empty-state';
import { FilterChips, type ChipOption } from '@/components/common/filter-chips';
import { WinnerCard } from '@/components/common/winner-card';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { PageHero } from '@/components/sections/page-hero';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, localizeHref, type Locale } from '@/lib/i18n/config';
import { buildMetadata } from '@/lib/seo/metadata';
import { getWinnerYears, getWinners } from '@/server/queries/winners';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = await getDictionary(locale);

  return buildMetadata({
    locale,
    path: '/winners',
    title: d.winners.title,
    description: d.winners.subtitle,
  });
}

export default async function WinnersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();

  const year = Number.parseInt(query.year ?? '', 10) || undefined;

  const [d, years, winners] = await Promise.all([
    getDictionary(locale),
    getWinnerYears(),
    getWinners(locale, year),
  ]);

  const base = localizeHref('/winners', locale as Locale);

  const chips: ChipOption[] = [
    { value: null, label: d.winners.allYears },
    ...years.map((y) => ({ value: String(y), label: String(y) })),
  ];

  // Group into seasons so the unfiltered view reads as a history rather than one long
  // undifferentiated list.
  const seasons = winners.reduce<Map<number, typeof winners>>((acc, winner) => {
    const bucket = acc.get(winner.year) ?? [];
    bucket.push(winner);
    acc.set(winner.year, bucket);
    return acc;
  }, new Map());

  const labels = {
    place: d.winners.place,
    grandPrix: d.winners.grandPrix,
    award: d.winners.award,
  };

  return (
    <>
      <PageHero
        kicker={d.nav.winners}
        title={d.winners.title}
        subtitle={d.winners.subtitle}
        crumbs={[
          { label: d.nav.home, href: localizeHref('/', locale as Locale) },
          { label: d.nav.winners },
        ]}
      />

      <section className="section bg-background">
        <div className="container">
          <FilterChips
            options={chips}
            active={year ? String(year) : null}
            buildHref={(value) => (value ? `${base}?year=${value}` : base)}
            label={d.winners.filterByYear}
            className="mb-14"
          />

          {winners.length ? (
            <div className="flex flex-col gap-16">
              {[...seasons.entries()].map(([seasonYear, entries]) => (
                <div key={seasonYear}>
                  <div className="flex items-center gap-5">
                    <h2 className="font-display text-display-sm font-bold text-primary">
                      {seasonYear}
                    </h2>
                    <span aria-hidden className="rule-gold h-px flex-1" />
                  </div>

                  <Stagger className="mt-8 grid gap-5 md:grid-cols-2">
                    {entries.map((winner) => (
                      <StaggerItem key={winner.id} className="h-full">
                        <WinnerCard winner={winner} labels={labels} className="h-full" />
                      </StaggerItem>
                    ))}
                  </Stagger>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message={d.winners.empty} icon={Trophy} />
          )}
        </div>
      </section>
    </>
  );
}

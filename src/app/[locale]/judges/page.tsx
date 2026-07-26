import { Users } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EmptyState } from '@/components/common/empty-state';
import { JudgeCard } from '@/components/common/judge-card';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { PageHero } from '@/components/sections/page-hero';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, localizeHref, type Locale } from '@/lib/i18n/config';
import { buildMetadata } from '@/lib/seo/metadata';
import { getJudges } from '@/server/queries/judges';

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
    path: '/judges',
    title: d.judges.title,
    description: d.judges.subtitle,
  });
}

export default async function JudgesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [d, judges] = await Promise.all([getDictionary(locale), getJudges(locale)]);

  return (
    <>
      <PageHero
        kicker={d.nav.judges}
        title={d.judges.title}
        subtitle={d.judges.subtitle}
        crumbs={[
          { label: d.nav.home, href: localizeHref('/', locale as Locale) },
          { label: d.nav.judges },
        ]}
      />

      <section className="section bg-background">
        <div className="container">
          {judges.length ? (
            <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {judges.map((judge) => (
                // The id is the anchor target for `/judges#slug`, which the home-page
                // cards link to. `:target` scroll-margin in globals.css clears the header.
                <StaggerItem key={judge.id} className="h-full">
                  <div id={judge.slug} className="h-full">
                    <JudgeCard
                      judge={judge}
                      locale={locale}
                      chairLabel={d.judges.chairman}
                      className="h-full"
                    />
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <EmptyState message={d.judges.empty} icon={Users} />
          )}
        </div>
      </section>
    </>
  );
}

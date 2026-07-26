import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EmptyState } from '@/components/common/empty-state';
import { Reveal } from '@/components/motion/reveal';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { PageHero } from '@/components/sections/page-hero';
import { SectionHeading } from '@/components/sections/section-heading';
import { HomePartners } from '@/components/sections/home-partners';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, localizeHref, type Locale } from '@/lib/i18n/config';
import { buildMetadata } from '@/lib/seo/metadata';
import { getPartners } from '@/server/queries/partners';

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
    path: '/about',
    title: d.about.title,
    description: d.about.history.body.slice(0, 200),
  });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [d, partners] = await Promise.all([getDictionary(locale), getPartners(locale)]);

  const pillars = [d.about.history, d.about.mission, d.about.vision];

  return (
    <>
      <PageHero
        kicker={d.nav.about}
        title={d.about.title}
        subtitle={d.about.subtitle}
        crumbs={[
          { label: d.nav.home, href: localizeHref('/', locale as Locale) },
          { label: d.nav.about },
        ]}
      />

      {/* History · Mission · Vision — three long-form blocks, alternating alignment so
          the page does not read as one uninterrupted column of prose. */}
      <section className="section bg-background">
        <div className="container flex flex-col gap-16 lg:gap-24">
          {pillars.map((pillar, index) => (
            <Reveal
              key={pillar.kicker}
              className="grid gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
            >
              <div className={index % 2 === 1 ? 'lg:order-2' : undefined}>
                <p className="kicker flex items-center gap-3">
                  <span aria-hidden className="h-px w-8 bg-gold" />
                  {pillar.kicker}
                </p>
                <h2 className="mt-5 text-display-md font-semibold">{pillar.title}</h2>
              </div>
              <p className="text-base leading-relaxed text-muted-foreground lg:text-lg">
                {pillar.body}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section bg-surface">
        <div className="container">
          <SectionHeading kicker={d.about.objectives.kicker} title={d.about.objectives.title} />

          <Stagger className="mt-14 grid gap-6 sm:grid-cols-2">
            {d.about.objectives.items.map((item, index) => (
              <StaggerItem key={item.title}>
                <article className="h-full rounded-card border border-border bg-card p-7 shadow-card">
                  {/* The index is decoration, so it carries the decorative gold at a
                      size where the contrast rule permits it. */}
                  <span
                    aria-hidden
                    className="font-display text-display-sm font-bold leading-none text-gold/50"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-4 font-display text-xl font-semibold">{item.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{item.body}</p>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="section-sm bg-background">
        <div className="container">
          <SectionHeading kicker={d.about.organizers.kicker} title={d.about.organizers.title} />
          <EmptyState className="mt-12" message={d.about.organizers.empty} />
        </div>
      </section>

      {partners.length ? <HomePartners dictionary={d} partners={partners} /> : null}
    </>
  );
}

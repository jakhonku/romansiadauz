import { Check, FileText } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EmptyState } from '@/components/common/empty-state';
import { Prose } from '@/components/common/prose';
import { Reveal } from '@/components/motion/reveal';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { PageHero } from '@/components/sections/page-hero';
import { SectionHeading } from '@/components/sections/section-heading';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, localizeHref, type Locale } from '@/lib/i18n/config';
import { buildMetadata } from '@/lib/seo/metadata';
import { getAgeCategories } from '@/server/queries/reference';
import { getPageBySlug } from '@/server/queries/pages';

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
    path: '/regulations',
    title: d.regulations.title,
    description: d.regulations.subtitle,
  });
}

export default async function RegulationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [d, categories, rulesPage] = await Promise.all([
    getDictionary(locale),
    getAgeCategories(locale),
    // The long-form rules text is editorial, so it lives in `pages` under the
    // `regulations` slug where staff can revise it between seasons without a deploy.
    getPageBySlug(locale, 'regulations'),
  ]);

  const r = d.regulations;

  return (
    <>
      <PageHero
        kicker={d.nav.regulations}
        title={r.title}
        subtitle={r.subtitle}
        crumbs={[
          { label: d.nav.home, href: localizeHref('/', locale as Locale) },
          { label: d.nav.regulations },
        ]}
      />

      <section className="section bg-background">
        <div className="container">
          <SectionHeading kicker={r.rules.kicker} title={r.rules.title} align="start" />

          <Reveal className="mt-10 max-w-3xl">
            {rulesPage ? (
              <Prose html={rulesPage.body} />
            ) : (
              <EmptyState message={d.common.noResultsHint} icon={FileText} />
            )}
          </Reveal>
        </div>
      </section>

      {/* Age categories — the one part of this page that is data, not prose, because the
          jury adjusts stage time and piece counts between seasons. */}
      <section className="section-sm bg-surface">
        <div className="container">
          <SectionHeading kicker={r.categories.kicker} title={r.categories.title} />

          {categories.length ? (
            <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((category) => (
                <StaggerItem key={category.id}>
                  <article className="h-full rounded-card border border-border bg-card p-6 text-center shadow-card">
                    <h3 className="font-display text-lg font-semibold">{category.name}</h3>

                    <p className="mt-4 font-display text-display-sm font-bold leading-none text-primary">
                      {category.minAge}–{category.maxAge}
                    </p>
                    <p className="mt-2 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {r.categories.years}
                    </p>

                    <dl className="mt-6 space-y-2 border-t border-border pt-5 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">{r.categories.duration}</dt>
                        <dd className="font-medium">{category.durationMinutes} min</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">{r.categories.pieces}</dt>
                        <dd className="font-medium">{category.piecesCount}</dd>
                      </div>
                    </dl>
                  </article>
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <EmptyState className="mt-12" message={d.common.noResults} />
          )}
        </div>
      </section>

      <section className="section bg-background">
        <div className="container">
          <SectionHeading kicker={r.criteria.kicker} title={r.criteria.title} />

          <Stagger className="mx-auto mt-12 flex max-w-3xl flex-col gap-4">
            {r.criteria.items.map((item) => (
              <StaggerItem key={item.title}>
                <article className="rounded-card border border-border bg-card p-6 shadow-card">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                    <span className="shrink-0 font-display text-xl font-bold text-gold-ink">
                      {item.weight}%
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>

                  {/* The weight bar is decorative; the number above it is the accessible
                      value, so the track is hidden from assistive tech. */}
                  <div aria-hidden className="mt-4 h-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gold-gradient" style={{ width: `${item.weight}%` }} />
                  </div>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="section-sm bg-surface">
        <div className="container">
          <SectionHeading kicker={r.documents.kicker} title={r.documents.title} />

          <Reveal className="mx-auto mt-12 max-w-2xl">
            <ul className="flex flex-col gap-3">
              {r.documents.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-card border border-border bg-card p-4 shadow-card"
                >
                  <Check className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>
    </>
  );
}

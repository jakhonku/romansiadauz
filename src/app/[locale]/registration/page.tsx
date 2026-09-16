import { CalendarClock, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { RegistrationForm } from '@/components/common/registration-form';
import { PageHero } from '@/components/sections/page-hero';
import { Button } from '@/components/ui/button';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { formatNumber, interpolate } from '@/lib/i18n/format';
import { isLocale, localizeHref, type Locale } from '@/lib/i18n/config';
import { buildMetadata } from '@/lib/seo/metadata';
import { applicationsAreOpen, resolveApplicationsCloseAt } from '@/lib/registration-window';
import { getRegistrationCount } from '@/server/queries/registration-count';
import { getNominations } from '@/server/queries/reference';
import { getSiteStats } from '@/server/queries/settings';

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
    path: '/registration',
    title: d.registration.title,
    description: d.registration.subtitle,
  });
}

export default async function RegistrationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [d, nominations, applicantCount, stats] = await Promise.all([
    getDictionary(locale),
    getNominations(locale),
    getRegistrationCount(),
    getSiteStats(),
  ]);

  // Hourly revalidation means a cached copy can outlive the deadline by up to an hour.
  // That is tolerable because `submitRegistration` re-checks the same instant and
  // refuses a late entry regardless of what this page happens to be showing.
  const isOpen = applicationsAreOpen(resolveApplicationsCloseAt(stats.applicationsCloseAt));

  return (
    <>
      <PageHero
        kicker={d.nav.register}
        title={d.registration.title}
        subtitle={d.registration.subtitle}
        crumbs={[
          { label: d.nav.home, href: localizeHref('/', locale as Locale) },
          { label: d.nav.register },
        ]}
      >
        {/*
          Social proof, and nothing more — a count, never a list. The applicant names
          on this page would be personal data belonging to people who are often minors,
          so `registrations` has no public read at all; the number is produced
          server-side with `head: true`, which returns no rows.

          Hidden at zero: "0 applications so far" discourages the first applicant,
          which is exactly the moment the encouragement is needed.
        */}
        <div className="flex flex-wrap items-center gap-3">
          {/* § III of the Regulations sets the closing date; an applicant should meet it
              before the form, not after filling it in. */}
          <p className="inline-flex items-center gap-2.5 rounded-full border border-gold/40 bg-background/70 px-4 py-2 text-sm">
            <CalendarClock className="size-4 text-gold" aria-hidden />
            <span className="text-muted-foreground">
              {isOpen ? d.registration.deadline : d.registration.closed.title}
            </span>
          </p>

          {applicantCount > 0 ? (
            <p className="inline-flex items-center gap-2.5 rounded-full border border-gold/40 bg-background/70 px-4 py-2 text-sm">
              <Users className="size-4 text-gold" aria-hidden />
              <span className="text-muted-foreground">
                {interpolate(d.registration.applicantsCount, {
                  count: formatNumber(applicantCount, locale),
                })}
              </span>
            </p>
          ) : null}
        </div>
      </PageHero>

      <section className="section bg-background">
        <div className="container">
          {isOpen ? (
            <RegistrationForm
              locale={locale}
              dictionary={d}
              nominations={nominations.map((n) => ({ id: n.id, name: n.name }))}
            />
          ) : (
            <div className="mx-auto flex max-w-xl flex-col items-center rounded-card border border-gold/40 bg-surface px-6 py-14 text-center">
              <CalendarClock className="size-12 text-gold" aria-hidden />
              <h2 className="mt-6 font-display text-display-sm font-semibold">
                {d.registration.closed.title}
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                {d.registration.closed.body}
              </p>
              <Button asChild className="mt-8">
                <Link href={localizeHref('/news', locale as Locale)}>
                  {d.registration.closed.cta}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

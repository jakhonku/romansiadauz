import { Users } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { RegistrationForm } from '@/components/common/registration-form';
import { PageHero } from '@/components/sections/page-hero';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { formatNumber, interpolate } from '@/lib/i18n/format';
import { isLocale, localizeHref, type Locale } from '@/lib/i18n/config';
import { buildMetadata } from '@/lib/seo/metadata';
import { getRegistrationCount } from '@/server/queries/registration-count';
import { getNominations } from '@/server/queries/reference';

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

  const [d, nominations, applicantCount] = await Promise.all([
    getDictionary(locale),
    getNominations(locale),
    getRegistrationCount(),
  ]);

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
      </PageHero>

      <section className="section bg-background">
        <div className="container">
          <RegistrationForm
            locale={locale}
            dictionary={d}
            nominations={nominations.map((n) => ({ id: n.id, name: n.name }))}
          />
        </div>
      </section>
    </>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { RegistrationForm } from '@/components/common/registration-form';
import { PageHero } from '@/components/sections/page-hero';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, localizeHref, type Locale } from '@/lib/i18n/config';
import { buildMetadata } from '@/lib/seo/metadata';
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

  const [d, nominations] = await Promise.all([getDictionary(locale), getNominations(locale)]);

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
      />

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

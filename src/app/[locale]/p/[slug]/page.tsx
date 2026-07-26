import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Prose } from '@/components/common/prose';
import { Reveal } from '@/components/motion/reveal';
import { PageHero } from '@/components/sections/page-hero';
import { formatDate } from '@/lib/i18n/format';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, localizeHref, locales, type Locale } from '@/lib/i18n/config';
import { buildMetadata } from '@/lib/seo/metadata';
import { getAllPageSlugs, getPageBySlug } from '@/server/queries/pages';

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getAllPageSlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const page = await getPageBySlug(locale, slug);
  if (!page) return {};

  return buildMetadata({
    locale,
    path: `/p/${page.slug}`,
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? '',
  });
}

/**
 * Editor-managed pages: privacy policy, terms, and whatever else staff add later.
 *
 * One route rather than a file per document, so publishing a new legal page is an admin
 * action instead of a deploy.
 */
export default async function StaticContentPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const page = await getPageBySlug(locale, slug);
  if (!page) notFound();

  const d = await getDictionary(locale);

  return (
    <>
      <PageHero
        title={page.title}
        crumbs={[
          { label: d.nav.home, href: localizeHref('/', locale as Locale) },
          { label: page.title },
        ]}
      />

      <section className="section bg-background">
        <div className="container">
          <Reveal className="mx-auto max-w-3xl">
            <Prose html={page.body} />

            <p className="mt-14 border-t border-border pt-6 text-xs text-muted-foreground">
              {d.common.publishedOn}: {formatDate(page.updatedAt, locale)}
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}

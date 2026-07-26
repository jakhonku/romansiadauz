import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/common/breadcrumbs';
import { NewsCard } from '@/components/common/news-card';
import { Prose } from '@/components/common/prose';
import { Reveal } from '@/components/motion/reveal';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { siteUrl } from '@/lib/env';
import { formatDate } from '@/lib/i18n/format';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, localeMetadata, localizeHref, locales, type Locale } from '@/lib/i18n/config';
import { buildMetadata } from '@/lib/seo/metadata';
import { getAllNewsSlugs, getLatestNews, getNewsBySlug } from '@/server/queries/news';

export const revalidate = 3600;

/**
 * Prerender every published article in every locale.
 *
 * `dynamicParams` stays at its default (true) so an article published after the last
 * build is still reachable — it renders on first request and is then cached.
 */
export async function generateStaticParams() {
  const slugs = await getAllNewsSlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const article = await getNewsBySlug(locale, slug);
  if (!article) return {};

  return buildMetadata({
    locale,
    path: `/news/${article.slug}`,
    title: article.seoTitle ?? article.title,
    description: article.seoDescription ?? article.excerpt ?? '',
    image: article.coverUrl ?? undefined,
    type: 'article',
    publishedTime: article.publishedAt ?? undefined,
  });
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const article = await getNewsBySlug(locale, slug);
  if (!article) notFound();

  const [d, related] = await Promise.all([getDictionary(locale), getLatestNews(locale, 4)]);

  // "Related" is currently "recent" minus this article — an honest placeholder until
  // there is enough published copy for tag-based similarity to mean anything.
  const others = related.filter((item) => item.id !== article.id).slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt ?? undefined,
    image: article.coverUrl ? [article.coverUrl] : undefined,
    datePublished: article.publishedAt ?? undefined,
    inLanguage: localeMetadata[locale].htmlLang,
    mainEntityOfPage: `${siteUrl}${localizeHref(`/news/${article.slug}`, locale)}`,
    publisher: { '@type': 'Organization', name: d.meta.siteName },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Structured data, not user content: the object above is built entirely from
        // typed fields, and JSON.stringify escapes the values.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="pt-[calc(theme(spacing.header)+3rem)]">
        <div className="container">
          <Breadcrumbs
            className="mb-8"
            items={[
              { label: d.nav.home, href: localizeHref('/', locale as Locale) },
              { label: d.nav.news, href: localizeHref('/news', locale as Locale) },
              { label: article.title },
            ]}
          />

          <Reveal className="mx-auto max-w-3xl text-center">
            {article.publishedAt ? (
              <time
                dateTime={article.publishedAt}
                className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-gold-ink"
              >
                {formatDate(article.publishedAt, locale)}
              </time>
            ) : null}

            <h1 className="mt-5 text-display-lg font-semibold">{article.title}</h1>

            {article.excerpt ? (
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{article.excerpt}</p>
            ) : null}
          </Reveal>
        </div>

        {article.coverUrl ? (
          <Reveal className="container mt-12">
            <div className="relative aspect-[16/9] overflow-hidden rounded-media bg-muted">
              <Image
                src={article.coverUrl}
                alt=""
                fill
                priority
                sizes="(min-width: 1360px) 1232px, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        ) : null}

        <div className="container mt-14">
          <Reveal className="mx-auto max-w-3xl">
            <Prose html={article.body} />
          </Reveal>

          <div className="mx-auto mt-14 max-w-3xl">
            <Separator tone="gold" />
            <div className="mt-8">
              <Button asChild variant="ghost" className="group -ms-3">
                <Link href={localizeHref('/news', locale as Locale)}>
                  <ArrowLeft className="transition-transform duration-300 ease-luxe group-hover:-translate-x-1 rtl:rotate-180" />
                  {d.common.backToList}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </article>

      {others.length ? (
        <section className="section bg-surface">
          <div className="container">
            <h2 className="text-display-sm font-semibold">{d.news.related}</h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((item) => (
                <NewsCard key={item.id} item={item} locale={locale} className="h-full" />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

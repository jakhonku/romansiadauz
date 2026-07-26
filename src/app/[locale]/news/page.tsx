import { Newspaper } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EmptyState } from '@/components/common/empty-state';
import { FilterChips, type ChipOption } from '@/components/common/filter-chips';
import { NewsCard } from '@/components/common/news-card';
import { Pagination } from '@/components/common/pagination';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { PageHero } from '@/components/sections/page-hero';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, localizeHref, type Locale } from '@/lib/i18n/config';
import { buildMetadata } from '@/lib/seo/metadata';
import { getNewsCategories, getNewsPage } from '@/server/queries/news';

/**
 * News index.
 *
 * Reads `searchParams`, so this route is dynamic rather than statically prerendered —
 * a page-and-filter combination is not a fixed set worth building ahead of time. The
 * article pages underneath it are static.
 */
export const revalidate = 600;

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
    path: '/news',
    title: d.news.title,
    description: d.news.subtitle,
  });
}

export default async function NewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();

  const page = Number.parseInt(query.page ?? '1', 10) || 1;
  const category = query.category || undefined;

  const [d, categories, result] = await Promise.all([
    getDictionary(locale),
    getNewsCategories(locale),
    getNewsPage(locale, { page, category }),
  ]);

  const base = localizeHref('/news', locale as Locale);

  const buildHref = (nextPage: number, nextCategory: string | null = category ?? null) => {
    const search = new URLSearchParams();
    if (nextCategory) search.set('category', nextCategory);
    if (nextPage > 1) search.set('page', String(nextPage));
    const qs = search.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const chips: ChipOption[] = [
    { value: null, label: d.news.allCategories },
    ...categories.map((c) => ({ value: c.slug, label: c.label })),
  ];

  return (
    <>
      <PageHero
        kicker={d.nav.news}
        title={d.news.title}
        subtitle={d.news.subtitle}
        crumbs={[
          { label: d.nav.home, href: localizeHref('/', locale as Locale) },
          { label: d.nav.news },
        ]}
      />

      <section className="section bg-background">
        <div className="container">
          <FilterChips
            options={chips}
            active={category ?? null}
            // Changing the filter always returns to page 1: page 4 of "all news" is
            // rarely page 4 of a single category.
            buildHref={(value) => buildHref(1, value)}
            label={d.news.categories}
            className="mb-14"
          />

          {result.items.length ? (
            <>
              <Stagger className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {result.items.map((item, index) => (
                  <StaggerItem key={item.id} className="h-full">
                    <NewsCard
                      item={item}
                      locale={locale}
                      priority={index < 3}
                      className="h-full"
                    />
                  </StaggerItem>
                ))}
              </Stagger>

              <Pagination
                className="mt-16"
                page={result.page}
                pageCount={result.pageCount}
                buildHref={(n) => buildHref(n)}
                labels={{
                  previous: d.common.previous,
                  next: d.common.next,
                  page: d.common.page,
                }}
              />
            </>
          ) : (
            <EmptyState message={d.news.empty} icon={Newspaper} />
          )}
        </div>
      </section>
    </>
  );
}

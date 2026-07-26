import { Film } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EmptyState } from '@/components/common/empty-state';
import { FilterChips, type ChipOption } from '@/components/common/filter-chips';
import { VideoCard } from '@/components/common/video-card';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { PageHero } from '@/components/sections/page-hero';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, localizeHref, type Locale } from '@/lib/i18n/config';
import { buildMetadata } from '@/lib/seo/metadata';
import { getVideoCategories, getVideos } from '@/server/queries/videos';

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
    path: '/videos',
    title: d.videos.title,
    description: d.videos.subtitle,
  });
}

export default async function VideosPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();

  const category = query.category || undefined;

  const [d, categories, videos] = await Promise.all([
    getDictionary(locale),
    getVideoCategories(locale),
    getVideos(locale, category),
  ]);

  const base = localizeHref('/videos', locale as Locale);

  const chips: ChipOption[] = [
    { value: null, label: d.videos.allCategories },
    ...categories.map((c) => ({ value: c.slug, label: c.label })),
  ];

  return (
    <>
      <PageHero
        kicker={d.nav.videos}
        title={d.videos.title}
        subtitle={d.videos.subtitle}
        crumbs={[
          { label: d.nav.home, href: localizeHref('/', locale as Locale) },
          { label: d.nav.videos },
        ]}
      />

      <section className="section bg-background">
        <div className="container">
          <FilterChips
            options={chips}
            active={category ?? null}
            buildHref={(value) => (value ? `${base}?category=${encodeURIComponent(value)}` : base)}
            label={d.videos.allCategories}
            className="mb-14"
          />

          {videos.length ? (
            <Stagger className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <StaggerItem key={video.id} className="h-full">
                  <VideoCard video={video} watchLabel={d.videos.watch} className="h-full" />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <EmptyState message={d.videos.empty} icon={Film} />
          )}
        </div>
      </section>
    </>
  );
}

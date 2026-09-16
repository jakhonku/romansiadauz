import { notFound } from 'next/navigation';

import { HomeAbout } from '@/components/sections/home-about';
import { HomeCta } from '@/components/sections/home-cta';
import { HomeEvents } from '@/components/sections/home-events';
import { HomeGallery } from '@/components/sections/home-gallery';
import { HomeHero } from '@/components/sections/home-hero';
import { HomeJudges } from '@/components/sections/home-judges';
import { HomeNews } from '@/components/sections/home-news';
import { HomePartners } from '@/components/sections/home-partners';
import { HomeStats } from '@/components/sections/home-stats';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale } from '@/lib/i18n/config';
import { getUpcomingEvents } from '@/server/queries/events';
import { getRecentPhotos } from '@/server/queries/gallery';
import { getJudges } from '@/server/queries/judges';
import { getLatestNews } from '@/server/queries/news';
import { getPartners } from '@/server/queries/partners';
import { getSiteStats } from '@/server/queries/settings';

/**
 * Home page.
 *
 * Statically rendered for all three locales and revalidated hourly. Once the admin
 * actions land they will additionally fire tag invalidations on publish, making the
 * hour a safety net rather than the mechanism.
 */
export const revalidate = 3600;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // The content queries are independent, so they go out together rather than
  // waterfalling — at build time this is the difference between one round trip and five.
  const [dictionary, events, news, judges, photos, partners, stats] = await Promise.all([
    getDictionary(locale),
    getUpcomingEvents(locale),
    getLatestNews(locale, 3),
    getJudges(locale, 4),
    getRecentPhotos(locale, 7),
    getPartners(locale),
    getSiteStats(),
  ]);

  return (
    <>
      <HomeHero
        locale={locale}
        dictionary={dictionary}
        applicationsCloseAt={stats.applicationsCloseAt}
      />
      <HomeStats locale={locale} dictionary={dictionary} stats={stats} />
      <HomeAbout locale={locale} dictionary={dictionary} />
      <HomeEvents locale={locale} dictionary={dictionary} items={events} />
      <HomeNews locale={locale} dictionary={dictionary} items={news} />
      <HomeJudges locale={locale} dictionary={dictionary} items={judges} />
      <HomeGallery locale={locale} dictionary={dictionary} photos={photos} />
      <HomePartners dictionary={dictionary} partners={partners} />
      <HomeCta locale={locale} dictionary={dictionary} />
    </>
  );
}

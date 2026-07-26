import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/env';
import { localeMetadata, locales, localizeHref } from '@/lib/i18n/config';
import { staticRoutes } from '@/lib/navigation';
import { getAllAlbumSlugs } from '@/server/queries/albums';
import { getAllNewsSlugs } from '@/server/queries/news';
import { getAllPageSlugs } from '@/server/queries/pages';

/**
 * Sitemap covering every locale × every entity.
 *
 * Each URL carries `alternates.languages`, which is how Google is told that `/uz/news`,
 * `/ru/news` and `/en/news` are translations of one page rather than three competing
 * near-duplicates. Emitting the three URLs without the alternates would actively hurt
 * ranking.
 *
 * The dynamic slugs come through `safeQuery`, so an unreachable database yields a
 * sitemap of the static routes instead of a 500 — a smaller sitemap is recoverable, a
 * broken one gets the whole file dropped by the crawler.
 */
export const revalidate = 3600;

function alternates(path: string) {
  return {
    languages: Object.fromEntries(
      locales.map((locale) => [localeMetadata[locale].htmlLang, `${siteUrl}${localizeHref(path, locale)}`]),
    ),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [newsSlugs, albumSlugs, pageSlugs] = await Promise.all([
    getAllNewsSlugs(),
    getAllAlbumSlugs(),
    getAllPageSlugs(),
  ]);

  const paths: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
    ...staticRoutes.map((path) => ({
      path,
      priority: path === '/' ? 1 : path === '/registration' ? 0.9 : 0.7,
      changeFrequency: (path === '/news' ? 'daily' : 'weekly') as 'daily' | 'weekly',
    })),
    ...newsSlugs.map((slug) => ({
      path: `/news/${slug}`,
      priority: 0.6,
      changeFrequency: 'monthly' as const,
    })),
    ...albumSlugs.map((slug) => ({
      path: `/gallery/${slug}`,
      priority: 0.5,
      changeFrequency: 'monthly' as const,
    })),
    ...pageSlugs.map((slug) => ({
      path: `/p/${slug}`,
      priority: 0.3,
      changeFrequency: 'monthly' as const,
    })),
  ];

  const now = new Date();

  return paths.flatMap(({ path, priority, changeFrequency }) =>
    locales.map((locale) => ({
      url: `${siteUrl}${localizeHref(path, locale)}`,
      lastModified: now,
      changeFrequency,
      priority,
      alternates: alternates(path),
    })),
  );
}

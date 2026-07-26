import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/env';

/**
 * `/admin` is disallowed here as a courtesy to well-behaved crawlers only — robots.txt
 * is not an access control. The panel is actually protected by middleware, by a
 * server-side role check in its layout, by RLS, and by the `X-Robots-Tag: noindex`
 * header set for `/admin/:path*` in `next.config.ts`.
 *
 * `/api` is disallowed for the same reason, and the search-parameter variants of the
 * list pages are excluded so a crawler spends its budget on articles rather than on
 * every page-and-filter permutation.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/*?page=', '/*?category=', '/*?year='],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

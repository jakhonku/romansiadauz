import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';

import { LOCALE_COOKIE, defaultLocale, isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';

/**
 * UI language for the admin panel.
 *
 * The panel keeps un-prefixed routes (`/admin/news`, not `/uz/admin/news`) so an
 * operator can paste a link to a record without dragging a locale segment along, and
 * so bookmarks survive a language change. The language therefore comes from the
 * `NEXT_LOCALE` cookie that middleware maintains, rather than from the path.
 *
 * Reading a cookie makes every admin route dynamic — which is exactly right: the panel
 * is auth-gated and served `no-store` (see `next.config.ts`).
 */
export const getAdminLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
});

export const getAdminDictionary = cache(async (): Promise<Dictionary> => {
  return getDictionary(await getAdminLocale());
});

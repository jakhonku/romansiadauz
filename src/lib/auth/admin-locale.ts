import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';

import {
  ADMIN_LOCALE_COOKIE,
  LOCALE_COOKIE,
  defaultAdminLocale,
  isAdminLocale,
  type AdminLocale,
} from '@/lib/i18n/config';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';

/**
 * UI language for the admin panel — Uzbek or Russian.
 *
 * The panel keeps un-prefixed routes (`/admin/news`, not `/uz/admin/news`) so an
 * operator can paste a link to a record without dragging a locale segment along, and
 * so bookmarks survive a language change. The language therefore comes from a cookie
 * rather than from the path.
 *
 * Two cookies are consulted, in order:
 *
 *   1. `ADMIN_LOCALE` — an explicit choice made in the panel's own switcher.
 *   2. `NEXT_LOCALE`  — the public site's preference, so an operator who has never
 *      touched the switcher still lands in the language they browse the site in.
 *
 * `NEXT_LOCALE` may hold `en`, which the panel does not offer; that falls through to
 * Uzbek rather than to an English panel that does not exist.
 *
 * Reading a cookie makes every admin route dynamic — which is exactly right: the panel
 * is auth-gated and served `no-store` (see `next.config.ts`).
 */
export const getAdminLocale = cache(async (): Promise<AdminLocale> => {
  const store = await cookies();

  const chosen = store.get(ADMIN_LOCALE_COOKIE)?.value;
  if (isAdminLocale(chosen)) return chosen;

  const site = store.get(LOCALE_COOKIE)?.value;
  return isAdminLocale(site) ? site : defaultAdminLocale;
});

export const getAdminDictionary = cache(async (): Promise<Dictionary> => {
  return getDictionary(await getAdminLocale());
});

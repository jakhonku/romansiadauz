'use server';

import { cookies } from 'next/headers';

import { ADMIN_LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isAdminLocale } from '@/lib/i18n/config';

/**
 * Remember which language the panel's chrome is drawn in.
 *
 * Deliberately not behind `requirePermission`, or even a session: the login screen
 * carries the same switcher, and a Russian-speaking operator should not have to read an
 * Uzbek form in order to reach the control that would have fixed it. The cookie holds a
 * UI preference and nothing else — it grants no access, and the value is rejected unless
 * it is one of the two languages the panel ships.
 *
 * `httpOnly` because only the server reads it; `secure` in production so it is not
 * carried over plain HTTP, but not in development, where there is no TLS to satisfy.
 */
export async function setAdminLocale(locale: string): Promise<void> {
  if (!isAdminLocale(locale)) return;

  (await cookies()).set(ADMIN_LOCALE_COOKIE, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
}

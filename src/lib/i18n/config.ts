/**
 * Locale configuration.
 *
 * Uzbek is the default because the festival is hosted in Uzbekistan and the marketing
 * material leads in Uzbek. Russian is the regional lingua franca for the CIS applicant
 * base, English serves the "International" half of the name.
 */
export const locales = ['uz', 'ru', 'en'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'uz';

/** Cookie that remembers an explicit language choice across visits. */
export const LOCALE_COOKIE = 'NEXT_LOCALE';

/** One year — a language preference should not expire mid-season. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Languages the admin panel's own chrome is offered in.
 *
 * The visitor-facing site is trilingual; the panel is not. The people who operate it
 * work in Uzbek or Russian, and an English *interface* nobody asked for would be a third
 * copy of every label to keep in step with the other two.
 *
 * This governs the chrome only. Content is still authored in all three locales — the
 * translation tabs in every editor are unaffected, because visitors read all three.
 */
export const adminLocales = ['uz', 'ru'] as const;

export type AdminLocale = (typeof adminLocales)[number];

export const defaultAdminLocale: AdminLocale = 'uz';

/**
 * The panel's language lives in its own cookie, not in `NEXT_LOCALE`.
 *
 * An operator previewing the English site in the next tab would otherwise drag the panel
 * along with them, and switching the panel to Russian would silently re-language the
 * public site they are checking. Two preferences, two cookies. `NEXT_LOCALE` is still
 * the fallback, so nobody has to make a choice before the panel picks a sensible one.
 */
export const ADMIN_LOCALE_COOKIE = 'ADMIN_LOCALE';

export function isAdminLocale(value: string | undefined | null): value is AdminLocale {
  return !!value && (adminLocales as readonly string[]).includes(value);
}

export const localeMetadata: Record<
  Locale,
  { label: string; nativeName: string; htmlLang: string; ogLocale: string; dir: 'ltr' }
> = {
  uz: { label: 'UZ', nativeName: "O'zbekcha", htmlLang: 'uz-UZ', ogLocale: 'uz_UZ', dir: 'ltr' },
  ru: { label: 'RU', nativeName: 'Русский', htmlLang: 'ru-RU', ogLocale: 'ru_RU', dir: 'ltr' },
  en: { label: 'EN', nativeName: 'English', htmlLang: 'en-US', ogLocale: 'en_US', dir: 'ltr' },
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/**
 * Content fallback chain. A missing Uzbek translation should degrade to Russian (which
 * every Uzbek speaker in the target audience reads) before English, rather than
 * rendering an empty section.
 */
export const localeFallbacks: Record<Locale, readonly Locale[]> = {
  uz: ['uz', 'ru', 'en'],
  ru: ['ru', 'uz', 'en'],
  en: ['en', 'ru', 'uz'],
};

/** Strip a leading `/uz`, `/ru`, `/en` from a pathname. Returns `/` for a bare locale. */
export function stripLocale(pathname: string): string {
  const segments = pathname.split('/');
  if (isLocale(segments[1])) {
    const rest = segments.slice(2).join('/');
    return rest ? `/${rest}` : '/';
  }
  return pathname;
}

/** Build a locale-prefixed href, normalising duplicate slashes. */
export function localizeHref(pathname: string, locale: Locale): string {
  const clean = stripLocale(pathname);
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`;
}

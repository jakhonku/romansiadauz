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

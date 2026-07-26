import type { Locale } from './config';

/** Maps our locale codes onto the BCP-47 tags the `Intl` APIs expect. */
const intlLocale: Record<Locale, string> = {
  uz: 'uz-UZ',
  ru: 'ru-RU',
  en: 'en-GB',
};

/**
 * Replace `{name}` placeholders in a dictionary string.
 *
 * Deliberately not a full ICU implementation — the copy in this product only ever needs
 * simple named substitution, and pulling in an ICU runtime for that would cost more
 * bundle weight than the entire dictionary.
 */
export function interpolate(
  template: string,
  values: Record<string, string | number> = {},
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export function formatDate(
  value: string | Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' },
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(intlLocale[locale], options).format(date);
}

export function formatDateTime(value: string | Date, locale: Locale): string {
  return formatDate(value, locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale[locale]).format(value);
}

/** U+00A0 for the space-grouping locales, so "1 000" never wraps mid-number. */
const groupSeparator: Record<Locale, string> = {
  uz: ' ',
  ru: ' ',
  en: ',',
};

/**
 * Group an integer for display — deterministically, without `Intl`.
 *
 * `Intl.NumberFormat` is *not* portable across the server/client boundary for our
 * locales: Node ships full ICU and renders `uz-UZ` 1000 as "1 000", while Chrome has no
 * Uzbek locale data, falls back to its default, and renders "1,000". Any Client
 * Component that formats a number that way hydrates with a mismatch and React throws
 * the subtree away. The statistics counters therefore go through this helper, which
 * produces byte-identical output in both environments.
 *
 * Server-only formatting (`formatNumber`, `formatDate`) can keep using `Intl` — it
 * renders once, so there is nothing to disagree with.
 */
export function formatInteger(value: number, locale: Locale): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator[locale]);
}

/** "3 daqiqa o'qish" — assumes ~180 words per minute, floored at one minute. */
export function readingTimeMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

/** Age in whole years at a given reference date. Used by registration validation. */
export function ageAt(birthDate: string | Date, reference: Date = new Date()): number {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  let age = reference.getFullYear() - birth.getFullYear();
  const monthDelta = reference.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && reference.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

import { siteUrl } from '@/lib/env';

/**
 * Build-time defaults for organisation details.
 *
 * The `site_settings` table is the runtime source of truth — an admin can change the
 * phone number without a deploy. These values are the fallback used before a settings
 * row exists and while a page renders statically, so the footer is never blank.
 */
export const siteConfig = {
  url: siteUrl,
  domain: 'romansiada.uz',
  /** Both taken from the closing lines of the Regulations. */
  email: 'romansiadauzbekistan@mail.ru',
  phone: '+99899 050 7144',
  /** `tel:` needs the bare international form, no spaces. */
  phoneHref: '+998990507144',
  addressKey: 'Toshkent',
  foundingYear: 2019,
  /**
   * Instant the festival opens, for the hero countdown.
   *
   * § II of the Regulations: 28–30 November 2026 in Tashkent. The document names the
   * days, not an hour, so the countdown runs to the start of the first day rather than
   * to an opening time nobody has announced. The `+05:00` offset is not optional:
   * without it the string is parsed as UTC and the countdown runs five hours late for
   * everyone in Tashkent.
   */
  festivalStartsAt: '2026-11-15T00:00:00+05:00',
  /** § III: entries close on 15 November 2026. */
  applicationsCloseAt: '2026-11-15T23:59:59+05:00',
  /**
   * Headline figures for the hero band. Editable from admin → settings → stats once a
   * `site_settings` row exists; these are the pre-launch defaults.
   */
  stats: {
    years: 20,
    participants: 1000,
    countries: 20,
    goal: 1,
  },
  social: {
    instagram: 'https://instagram.com/romansiada.uz',
    telegram: 'https://t.me/romansiada_uz',
    youtube: 'https://youtube.com/@romansiada',
    facebook: 'https://facebook.com/romansiada.uz',
  },
} as const;

export type SocialPlatform = keyof typeof siteConfig.social;

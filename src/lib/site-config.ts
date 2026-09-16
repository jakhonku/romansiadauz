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
  domain: 'romasiada.uz',
  /** Both taken from the closing lines of the Regulations. */
  email: 'romansiadauzbekistan@mail.ru',
  phone: '+99899 050 7144',
  /** `tel:` needs the bare international form, no spaces. */
  phoneHref: '+998990507144',
  addressKey: 'Toshkent',
  foundingYear: 2019,
  /**
   * Instant the festival opens.
   *
   * § II of the Regulations: 28–30 November 2026 in Tashkent. The document names the
   * days, not an hour, so this is the start of the first day rather than an opening
   * time nobody has announced.
   */
  festivalStartsAt: '2026-11-28T00:00:00+05:00',
  /**
   * Instant entries close — § III: 20 November 2026 — and the target of the hero
   * countdown, which counts down the time left to apply rather than the time left
   * until the competition. The `+05:00` offset is not optional: without it the string
   * is parsed as UTC and the deadline lands five hours early for everyone in Tashkent.
   */
  applicationsCloseAt: '2026-11-20T23:59:59+05:00',
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

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
  email: 'info@romansiada.uz',
  phone: '+998 71 200 00 00',
  /** `tel:` needs the bare international form, no spaces. */
  phoneHref: '+998712000000',
  addressKey: 'Toshkent',
  foundingYear: 2019,
  /**
   * Instant the festival opens, for the hero countdown.
   *
   * PLACEHOLDER — replace with the announced date. The `+05:00` offset is not optional:
   * without it the string is parsed as UTC and the countdown runs five hours late for
   * everyone in Tashkent.
   */
  festivalStartsAt: '2026-11-20T10:00:00+05:00',
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

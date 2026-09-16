import 'server-only';

import { cache } from 'react';

import { siteConfig } from '@/lib/site-config';
import { createPublicSupabase } from '@/lib/supabase/public';

import { safeQuery } from './shared';

export interface SiteStats {
  years: number;
  participants: number;
  countries: number;
  goal: number;
  /** Target of the hero countdown: the instant entries close. */
  applicationsCloseAt: string | null;
}

interface SiteSettingsRow {
  stats: Partial<SiteStats> | null;
}

/**
 * Give a naive admin-entered instant the Tashkent offset.
 *
 * The settings form is an `<input type="datetime-local">`, which submits
 * `2026-11-20T23:59` — no zone. `new Date()` reads that in the *viewer's* zone, so a
 * visitor in Moscow would be counting down to a different moment than one in Tashkent,
 * and both would disagree with the organisers. The organisers enter Tashkent time, so
 * that is what an offset-less value means.
 */
function withTashkentOffset(value: string): string {
  if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(value)) return value;
  // `datetime-local` omits seconds when they are zero; pad to a full ISO local time.
  const padded = value.length === 16 ? `${value}:00` : value.slice(0, 19);
  return `${padded}+05:00`;
}

/**
 * Fetch stats settings from `site_settings` table.
 * Falls back to siteConfig defaults if table/column is unconfigured or null.
 */
export const getSiteStats = cache(async (): Promise<SiteStats> => {
  const supabase = createPublicSupabase();

  const data = await safeQuery<SiteSettingsRow | null>(
    'site-stats',
    () =>
      supabase
        .from('site_settings')
        .select('stats')
        .eq('id', 1)
        .maybeSingle<SiteSettingsRow>(),
    null,
  );

  const stats = data?.stats;

  // The pre-rename `festivalDate` key is deliberately *not* read as a fallback. The
  // live settings row holds 2026-11-28 under it — the opening of the competition, which
  // is what that field used to mean. Reusing it as the application deadline would push
  // the countdown eight days past the date entries actually close. Until an
  // administrator fills in the new field, the build-time default is the correct answer.
  const closesAt =
    typeof stats?.applicationsCloseAt === 'string' && stats.applicationsCloseAt
      ? stats.applicationsCloseAt
      : null;

  return {
    years: typeof stats?.years === 'number' ? stats.years : siteConfig.stats.years,
    participants:
      typeof stats?.participants === 'number' ? stats.participants : siteConfig.stats.participants,
    countries: typeof stats?.countries === 'number' ? stats.countries : siteConfig.stats.countries,
    goal: typeof stats?.goal === 'number' ? stats.goal : siteConfig.stats.goal,
    applicationsCloseAt: closesAt ? withTashkentOffset(closesAt) : null,
  };
});

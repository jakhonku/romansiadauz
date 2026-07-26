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
  festivalDate: string | null;
}

interface SiteSettingsRow {
  stats: Partial<SiteStats & { festivalDate: string | null }> | null;
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

  return {
    years: typeof stats?.years === 'number' ? stats.years : siteConfig.stats.years,
    participants:
      typeof stats?.participants === 'number' ? stats.participants : siteConfig.stats.participants,
    countries: typeof stats?.countries === 'number' ? stats.countries : siteConfig.stats.countries,
    goal: typeof stats?.goal === 'number' ? stats.goal : siteConfig.stats.goal,
    festivalDate: typeof stats?.festivalDate === 'string' ? stats.festivalDate : null,
  };
});

import 'server-only';

import { cache } from 'react';

import type { Locale } from '@/lib/i18n/config';
import { createPublicSupabase } from '@/lib/supabase/public';
import { mediaUrl } from '@/lib/supabase/storage';
import type { PartnerSummary } from '@/types/content';

import { pickTranslation, safeQuery } from './shared';

const SUMMARY_SELECT = `
  id, slug, logo_path, logo_dark_path, website_url, tier, sort_order,
  translations:partner_translations ( locale, name )
` as const;

interface SummaryRow {
  id: string;
  slug: string;
  logo_path: string | null;
  logo_dark_path: string | null;
  website_url: string | null;
  tier: number;
  sort_order: number;
  translations: { locale: 'uz' | 'ru' | 'en'; name: string }[] | null;
}

/** Published partners, most prominent tier first. */
export const getPartners = cache(async (locale: Locale): Promise<PartnerSummary[]> => {
  const supabase = createPublicSupabase();

  const rows = await safeQuery<SummaryRow[]>(
    'partners',
    () =>
      supabase
        .from('partners')
        .select(SUMMARY_SELECT)
        .eq('status', 'published')
        .order('tier', { ascending: true })
        .order('sort_order', { ascending: true })
        .returns<SummaryRow[]>(),
    [],
  );

  return rows.flatMap((row) => {
    const t = pickTranslation(row.translations, locale);
    if (!t) return [];
    return [
      {
        id: row.id,
        slug: row.slug,
        name: t.name,
        logoUrl: mediaUrl(row.logo_path),
        logoDarkUrl: mediaUrl(row.logo_dark_path),
        websiteUrl: row.website_url,
        tier: row.tier,
      },
    ];
  });
});

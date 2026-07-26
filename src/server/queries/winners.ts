import 'server-only';

import { cache } from 'react';

import type { Locale } from '@/lib/i18n/config';
import { createPublicSupabase } from '@/lib/supabase/public';
import { mediaUrl } from '@/lib/supabase/storage';
import type { WinnerSummary } from '@/types/content';

import { pickTranslation, safeQuery } from './shared';

const WINNER_SELECT = `
  id, year, place, is_grand_prix, photo_path, country_code, sort_order,
  translations:winner_translations ( locale, full_name, award_title )
` as const;

interface WinnerRowShape {
  id: string;
  year: number;
  place: number | null;
  is_grand_prix: boolean;
  photo_path: string | null;
  country_code: string | null;
  sort_order: number;
  translations: { locale: 'uz' | 'ru' | 'en'; full_name: string; award_title: string | null }[] | null;
}

/**
 * Laureates, newest season first and grand-prix at the top within each year.
 *
 * The ordering is `year desc, is_grand_prix desc, place asc` — a null `place` (a
 * special award rather than a podium finish) sorts last, which is where the printed
 * programmes put them too.
 */
export const getWinners = cache(
  async (locale: Locale, year?: number): Promise<WinnerSummary[]> => {
    const supabase = createPublicSupabase();

    const rows = await safeQuery<WinnerRowShape[]>(
      'winners',
      () => {
        let query = supabase.from('winners').select(WINNER_SELECT).eq('status', 'published');
        if (year) query = query.eq('year', year);

        return query
          .order('year', { ascending: false })
          .order('is_grand_prix', { ascending: false })
          .order('place', { ascending: true, nullsFirst: false })
          .order('sort_order', { ascending: true })
          .returns<WinnerRowShape[]>();
      },
      [],
    );

    return rows.flatMap((row) => {
      const t = pickTranslation(row.translations, locale);
      if (!t) return [];
      return [
        {
          id: row.id,
          fullName: t.full_name,
          awardTitle: t.award_title,
          year: row.year,
          place: row.place,
          isGrandPrix: row.is_grand_prix,
          photoUrl: mediaUrl(row.photo_path),
          countryCode: row.country_code,
        },
      ];
    });
  },
);

/** Distinct seasons, for the year filter. Newest first. */
export const getWinnerYears = cache(async (): Promise<number[]> => {
  const supabase = createPublicSupabase();

  const rows = await safeQuery<{ year: number }[]>(
    'winner-years',
    () =>
      supabase
        .from('winners')
        .select('year')
        .eq('status', 'published')
        .order('year', { ascending: false })
        .returns<{ year: number }[]>(),
    [],
  );

  // PostgREST has no DISTINCT, and a dedicated RPC for a list this short would be
  // heavier than deduplicating a few dozen integers here.
  return [...new Set(rows.map((row) => row.year))];
});

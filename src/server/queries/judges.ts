import 'server-only';

import { cache } from 'react';

import type { Locale } from '@/lib/i18n/config';
import { createPublicSupabase } from '@/lib/supabase/public';
import { mediaUrl } from '@/lib/supabase/storage';
import type { JudgeSummary } from '@/types/content';

import { pickTranslation, safeQuery } from './shared';

const SUMMARY_SELECT = `
  id, slug, photo_path, country_code, is_chair, sort_order,
  translations:judge_translations ( locale, full_name, role_title )
` as const;

interface SummaryRow {
  id: string;
  slug: string;
  photo_path: string | null;
  country_code: string | null;
  is_chair: boolean;
  sort_order: number;
  translations: { locale: 'uz' | 'ru' | 'en'; full_name: string; role_title: string | null }[] | null;
}

/**
 * Jury members in editorial order, chair first.
 *
 * Ordering is `is_chair desc, sort_order` rather than sort_order alone so the chair
 * cannot be accidentally demoted below the panel by an editor reshuffling the list.
 */
export const getJudges = cache(async (locale: Locale, limit?: number): Promise<JudgeSummary[]> => {
  const supabase = createPublicSupabase();

  const rows = await safeQuery<SummaryRow[]>(
    'judges',
    () => {
      const query = supabase
        .from('judges')
        .select(SUMMARY_SELECT)
        .eq('status', 'published')
        .order('is_chair', { ascending: false })
        .order('sort_order', { ascending: true });

      return (limit ? query.limit(limit) : query).returns<SummaryRow[]>();
    },
    [],
  );

  return rows.flatMap((row) => {
    const t = pickTranslation(row.translations, locale);
    if (!t) return [];
    return [
      {
        id: row.id,
        slug: row.slug,
        fullName: t.full_name,
        roleTitle: t.role_title,
        photoUrl: mediaUrl(row.photo_path),
        countryCode: row.country_code,
        isChair: row.is_chair,
      },
    ];
  });
});

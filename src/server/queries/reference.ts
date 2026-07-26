import 'server-only';

import { cache } from 'react';

import type { Locale } from '@/lib/i18n/config';
import { createPublicSupabase } from '@/lib/supabase/public';
import { cacheReference } from './cache';

import { safeQuery } from './shared';

/**
 * Seeded reference lists (`regions`, `age_categories`, `nominations`, …).
 *
 * These carry `name_uz / name_ru / name_en` columns instead of translation tables — see
 * ARCHITECTURE §4 for why — so "translating" one is just picking a column.
 */
export interface LookupOption {
  id: string;
  code: string;
  name: string;
}

type LookupRow = {
  id: string;
  code: string;
  name_uz: string;
  name_ru: string;
  name_en: string;
};

const nameColumn: Record<Locale, keyof LookupRow> = {
  uz: 'name_uz',
  ru: 'name_ru',
  en: 'name_en',
};

function toOption(row: LookupRow, locale: Locale): LookupOption {
  return { id: row.id, code: row.code, name: String(row[nameColumn[locale]]) };
}

/** «Номинация» options for the application form. */
export const getNominations = cache(
  cacheReference(['nominations'], async (locale: Locale): Promise<LookupOption[]> => {
  const supabase = createPublicSupabase();

  const rows = await safeQuery<LookupRow[]>(
    'nominations',
    () =>
      supabase
        .from('nominations')
        .select('id, code, name_uz, name_ru, name_en')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .returns<LookupRow[]>(),
    [],
  );

    return rows.map((row) => toOption(row, locale));
  }),
);

export interface AgeCategory extends LookupOption {
  minAge: number;
  maxAge: number;
  durationMinutes: number;
  piecesCount: number;
}

type AgeCategoryRowShape = LookupRow & {
  min_age: number;
  max_age: number;
  duration_minutes: number;
  pieces_count: number;
};

/** Age groups, quoted on the Regulations page with their stage time and piece count. */
export const getAgeCategories = cache(
  cacheReference(['age-categories'], async (locale: Locale): Promise<AgeCategory[]> => {
  const supabase = createPublicSupabase();

  const rows = await safeQuery<AgeCategoryRowShape[]>(
    'age-categories',
    () =>
      supabase
        .from('age_categories')
        .select('id, code, name_uz, name_ru, name_en, min_age, max_age, duration_minutes, pieces_count')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .returns<AgeCategoryRowShape[]>(),
    [],
  );

    return rows.map((row) => ({
      ...toOption(row, locale),
      minAge: row.min_age,
      maxAge: row.max_age,
      durationMinutes: row.duration_minutes,
      piecesCount: row.pieces_count,
    }));
  }),
);

import 'server-only';

import { cache } from 'react';

import type { Locale } from '@/lib/i18n/config';
import { createPublicSupabase } from '@/lib/supabase/public';
import type { EventSummary } from '@/types/content';

import { pickTranslation, safeQuery } from './shared';

const SUMMARY_SELECT = `
  id, slug, starts_at, ends_at,
  translations:event_translations ( locale, title, description, location )
` as const;

interface SummaryRow {
  id: string;
  slug: string;
  starts_at: string;
  ends_at: string | null;
  translations:
    | { locale: 'uz' | 'ru' | 'en'; title: string; description: string | null; location: string | null }[]
    | null;
}

/**
 * The next scheduled festival stages, soonest first.
 *
 * The cut-off is `ends_at ?? starts_at >= now`, expressed as two filters because
 * PostgREST has no `coalesce` in a filter: an event that started yesterday but runs
 * until Sunday is still upcoming, and dropping it mid-run would be wrong.
 */
export const getUpcomingEvents = cache(
  async (locale: Locale, limit = 4): Promise<EventSummary[]> => {
    const supabase = createPublicSupabase();
    const now = new Date().toISOString();

    const rows = await safeQuery<SummaryRow[]>(
      'upcoming-events',
      () =>
        supabase
          .from('events')
          .select(SUMMARY_SELECT)
          .eq('status', 'published')
          .or(`ends_at.gte.${now},and(ends_at.is.null,starts_at.gte.${now})`)
          .order('starts_at', { ascending: true })
          .limit(limit)
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
          title: t.title,
          description: t.description,
          location: t.location,
          startsAt: row.starts_at,
          endsAt: row.ends_at,
        },
      ];
    });
  },
);

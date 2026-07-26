import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { locales } from '@/lib/i18n/config';
import type { Database, LocaleCode } from '@/types/database.types';

/** Translation tables that follow the `(<parent>_id, locale)` shape. */
export type TranslationTable =
  | 'news_translations'
  | 'judge_translations'
  | 'album_translations'
  | 'photo_translations'
  | 'video_translations'
  | 'winner_translations'
  | 'partner_translations'
  | 'event_translations'
  | 'page_translations';

/**
 * Write the locales an editor filled in, and delete the ones they emptied.
 *
 * The delete half is the part that is easy to forget and expensive to get wrong: an
 * `upsert`-only implementation leaves the previous English text live on the public site
 * after an editor clears the English tab, which reads as the CMS ignoring them.
 *
 * Rows with no content are never written either — an empty translation row still
 * satisfies the fallback chain's `find` in `pickTranslation`, so it would shadow the
 * locale that actually has text and blank out the page.
 *
 * The casts are unavoidable: the table name is a runtime union, so `supabase-js` cannot
 * narrow the row type from it. Every caller builds its rows from a typed object first,
 * which is where the real checking happens.
 */
export async function syncTranslations(
  supabase: SupabaseClient<Database>,
  table: TranslationTable,
  foreignKey: string,
  parentId: string,
  rows: ({ locale: LocaleCode } & Record<string, unknown>)[],
): Promise<string | null> {
  if (rows.length) {
    const payload = rows.map((row) => ({ ...row, [foreignKey]: parentId }));

    const { error } = await supabase
      .from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(payload as any, { onConflict: `${foreignKey},locale` });

    if (error) {
      console.error(`[translations:${table}]`, error.message);
      return error.message;
    }
  }

  const kept = rows.map((row) => row.locale);
  const dropped = locales.filter((locale) => !kept.includes(locale));

  if (dropped.length) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq(foreignKey, parentId)
      .in('locale', dropped);

    if (error) {
      console.error(`[translations:${table}:prune]`, error.message);
      return error.message;
    }
  }

  return null;
}

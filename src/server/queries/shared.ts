import 'server-only';

import { isSupabaseConfigured } from '@/lib/env';
import { localeFallbacks, type Locale } from '@/lib/i18n/config';
import type { LocaleCode } from '@/types/database.types';

/**
 * Shared plumbing for the public read layer.
 */

interface Translated {
  locale: LocaleCode;
}

/**
 * Choose the best available translation for `locale`, walking the fallback chain.
 *
 * The rows arrive already embedded by PostgREST (`*, translations:news_translations(*)`),
 * so this is a pick over an in-memory array of at most three items, not another query.
 *
 * ARCHITECTURE §4 describes this fallback as "a single SQL expression". It is one
 * *round trip*, but the pick happens here rather than in SQL: PostgREST cannot express
 * a correlated `LATERAL … ORDER BY array_position(...) LIMIT 1` against an embedded
 * relation, and the alternative — a database view per translated entity — would put
 * nine more objects in the migration set to save transferring two short rows per
 * record. If the payload ever justifies it, the view is the upgrade path.
 */
export function pickTranslation<T extends Translated>(
  translations: T[] | null | undefined,
  locale: Locale,
): T | null {
  if (!translations?.length) return null;
  for (const candidate of localeFallbacks[locale]) {
    const match = translations.find((t) => t.locale === candidate);
    if (match) return match;
  }
  // A row whose translations exist but match no known locale is a data bug, not a
  // rendering problem — show something rather than a hole.
  return translations[0] ?? null;
}

/** Logged once per process, not once per query — six identical lines per page is noise. */
let warnedUnconfigured = false;

/**
 * Run a public query, returning `fallback` if it fails.
 *
 * Public pages are statically generated. Without this, an unreachable database — an
 * unprovisioned project, a paused free-tier instance, a network blip during a
 * revalidation — turns into a failed `next build` or a 500 for every visitor. Degrading
 * to the section's empty state is strictly better: the dictionaries already carry copy
 * for "no news yet", and the page still renders its shell, navigation and SEO tags.
 *
 * Two distinct failure modes are handled differently:
 *
 *   - **Not configured at all.** Skipped without touching the network. Waiting out a
 *     DNS failure per query was costing seconds per page render.
 *   - **Configured but failing.** Attempted, then logged and degraded.
 *
 * Errors are logged, never swallowed silently.
 */
export async function safeQuery<T>(
  label: string,
  run: () => PromiseLike<{ data: T | null; error: { message: string } | null }>,
  fallback: T,
): Promise<T> {
  if (!isSupabaseConfigured) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.warn(
        '[query] Supabase is not configured — every public list will render its empty ' +
          'state. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      );
    }
    return fallback;
  }

  try {
    const { data, error } = await run();
    if (error) {
      console.warn(`[query:${label}] ${error.message}`);
      return fallback;
    }
    return data ?? fallback;
  } catch (cause) {
    console.warn(`[query:${label}] ${cause instanceof Error ? cause.message : String(cause)}`);
    return fallback;
  }
}

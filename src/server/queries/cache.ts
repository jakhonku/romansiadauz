import 'server-only';

import { unstable_cache } from 'next/cache';

/**
 * Cross-request cache for slow-moving lookups.
 *
 * `React.cache` — already used on every query — only dedupes within a *single* render.
 * The reference lists are shared by every visitor and change perhaps twice a year, so
 * re-fetching them per request is pure waste.
 *
 * It matters here more than it usually would: this project's Supabase instance answers
 * in roughly 450ms per round trip, so each avoided query is close to half a second off
 * a page render. On the home page that is the difference between one round trip and
 * seven.
 *
 * Only for data that is the same for everyone. Never wrap a query whose result depends
 * on the caller — `unstable_cache` has no notion of a session, and a per-user result
 * cached here would be served to the next visitor.
 */
export const REFERENCE_TAG = 'reference-data';

/** A day. These lists are seeded and edited from the admin panel, which revalidates the tag. */
const REFERENCE_TTL_SECONDS = 60 * 60 * 24;

export function cacheReference<Args extends unknown[], Result>(
  keyParts: string[],
  fn: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  return unstable_cache(fn, keyParts, {
    revalidate: REFERENCE_TTL_SECONDS,
    tags: [REFERENCE_TAG],
  });
}

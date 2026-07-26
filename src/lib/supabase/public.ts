import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { clientEnv } from '@/lib/env';
import type { Database } from '@/types/database.types';

/**
 * Anonymous read client for public page data.
 *
 * Distinct from `createServerSupabase()` for one specific reason: that client reads
 * `cookies()`, and touching `cookies()` opts a route out of static rendering. The
 * public site is ISR — every page in `[locale]/` is prerendered — so its queries must
 * not depend on the request at all. There is no session to carry here anyway: this
 * client only ever reads rows that RLS exposes to `anon`.
 *
 * Module-level singleton is safe precisely because it holds no per-user state.
 */
/**
 * Ceiling on a single public read.
 *
 * A page renders five or six of these in parallel, so without a bound one sick query
 * holds the whole response open. Six seconds is far longer than a healthy PostgREST
 * call and short enough that a visitor gets the empty state instead of a spinner that
 * never resolves — `safeQuery` catches the abort and degrades like any other failure.
 */
const QUERY_TIMEOUT_MS = 6000;

let cached: ReturnType<typeof createClient<Database>> | null = null;

export function createPublicSupabase() {
  cached ??= createClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        // No session, no refresh timer, nothing to persist — this client is read-only
        // and lives for the lifetime of the server process.
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(QUERY_TIMEOUT_MS) }),
      },
    },
  );
  return cached;
}

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
    },
  );
  return cached;
}

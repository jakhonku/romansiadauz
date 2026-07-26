import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { clientEnv, serverEnv } from '@/lib/env';
import type { Database } from '@/types/database.types';

/**
 * Service-role client. **Bypasses Row Level Security entirely.**
 *
 * Legitimate uses in this codebase, and no others:
 *   1. Writing a festival application or contact message after the Server Action has
 *      validated it with Zod and cleared the rate limiter. The public has no INSERT
 *      policy on those tables precisely so that this is the only path in.
 *   2. Consuming the rate-limit counter (`consume_rate_limit`).
 *   3. Administrative user management (inviting staff, changing roles).
 *
 * There is no applicant-document use: the application form collects no files. See the
 * header of `0004_registrations.sql`.
 *
 * Never import this from a Client Component, and never pass a caller-supplied filter
 * straight into a query made with it — RLS is not there to catch the mistake.
 */
let cached: ReturnType<typeof createClient<Database>> | null = null;

export function createAdminClient() {
  cached ??= createClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        // A service-role client has no user session to persist or refresh.
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
  return cached;
}

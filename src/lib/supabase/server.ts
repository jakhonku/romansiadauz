import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { clientEnv } from '@/lib/env';
import type { Database } from '@/types/database.types';

/**
 * Request-scoped client that carries the visitor's session cookie, so every query
 * runs under that user's RLS policies.
 *
 * Must be created per request — never hoisted to a module-level singleton, which
 * would leak one user's session into another user's request.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot mutate cookies. This is expected and safe:
            // token refresh is handled by the middleware, which *can* write them.
          }
        },
      },
    },
  );
}

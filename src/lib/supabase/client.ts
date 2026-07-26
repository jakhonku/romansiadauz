'use client';

import { createBrowserClient } from '@supabase/ssr';

import { clientEnv } from '@/lib/env';
import type { Database } from '@/types/database.types';

/**
 * Browser client, bound to the publishable (anon) key and therefore subject to RLS.
 *
 * Used only for interactive admin work — session sign-in/out and direct-to-storage
 * uploads of editorial media. Public page data is fetched on the server; the visitor
 * side of this site ships no Supabase queries at all.
 */
export function createClient() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

import 'server-only';

import { unstable_cache } from 'next/cache';

import { isSupabaseConfigured } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * How many applications have been submitted.
 *
 * Uses the service-role client, which is unusual for a public page and worth
 * justifying: `registrations` has no `anon` SELECT policy at all (ARCHITECTURE §6),
 * because it holds names, dates of birth and contact details. Granting `anon` a
 * read to produce a number would open the whole table.
 *
 * `head: true` with `count: 'exact'` asks Postgres for the count and returns no rows,
 * so nothing but an integer ever leaves the server. The count is the only thing the
 * component receives.
 *
 * Cached for five minutes. This is social proof on a landing page, not a live
 * dashboard — a visitor does not need to see their own submission reflected the
 * instant they press send, and without the cache every page view would cost a round
 * trip to a database that answers in ~450ms.
 */
export const getRegistrationCount = unstable_cache(
  async (): Promise<number> => {
    if (!isSupabaseConfigured) return 0;

    try {
      const supabase = createAdminClient();
      const { count, error } = await supabase
        .from('registrations')
        .select('id', { count: 'exact', head: true });

      if (error) {
        console.warn('[registration-count]', error.message);
        return 0;
      }

      return count ?? 0;
    } catch (cause) {
      console.warn('[registration-count]', cause instanceof Error ? cause.message : cause);
      return 0;
    }
  },
  ['registration-count'],
  { revalidate: 300, tags: ['registration-count'] },
);

import 'server-only';

import { isSupabaseConfigured } from '@/lib/env';
import { createServerSupabase } from '@/lib/supabase/server';

export interface DashboardStats {
  registrationsTotal: number;
  registrationsPending: number;
  registrationsApproved: number;
  registrationsRejected: number;
  newsPublished: number;
  messagesUnread: number;
}

/**
 * Headline counters for the admin dashboard.
 *
 * Runs through the *session* client, not the service-role one: the numbers a viewer
 * sees must be the numbers RLS lets them see. A moderator counting registrations is
 * legitimate; an editor should get zero rather than a total they cannot open.
 *
 * `head: true` with `count: 'exact'` asks Postgres for the count and no rows at all —
 * six cheap counts rather than six result sets.
 */
const EMPTY_STATS: DashboardStats = {
  registrationsTotal: 0,
  registrationsPending: 0,
  registrationsApproved: 0,
  registrationsRejected: 0,
  newsPublished: 0,
  messagesUnread: 0,
};

export async function getDashboardStats(): Promise<DashboardStats> {
  // Same fast path as `safeQuery`: with no project provisioned these six counts would
  // each wait out a DNS failure before the dashboard could render.
  if (!isSupabaseConfigured) return EMPTY_STATS;

  const supabase = await createServerSupabase();

  const countOf = async (
    table: 'registrations' | 'news' | 'contact_messages',
    apply: (q: ReturnType<ReturnType<typeof supabase.from>['select']>) => typeof q,
  ): Promise<number> => {
    try {
      const { count, error } = await apply(
        supabase.from(table).select('id', { count: 'exact', head: true }),
      );
      if (error) {
        console.warn(`[dashboard:${table}] ${error.message}`);
        return 0;
      }
      return count ?? 0;
    } catch (cause) {
      console.warn(`[dashboard:${table}] ${cause instanceof Error ? cause.message : cause}`);
      return 0;
    }
  };

  const [total, pending, approved, rejected, newsPublished, messagesUnread] = await Promise.all([
    countOf('registrations', (q) => q),
    countOf('registrations', (q) => q.eq('status', 'pending')),
    countOf('registrations', (q) => q.eq('status', 'approved')),
    countOf('registrations', (q) => q.eq('status', 'rejected')),
    countOf('news', (q) => q.eq('status', 'published')),
    countOf('contact_messages', (q) => q.eq('is_read', false)),
  ]);

  return {
    registrationsTotal: total,
    registrationsPending: pending,
    registrationsApproved: approved,
    registrationsRejected: rejected,
    newsPublished,
    messagesUnread,
  };
}

import 'server-only';

import { headers } from 'next/headers';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Fixed-window rate limiting, backed by the `consume_rate_limit` function in 0005.
 *
 * Counted in Postgres rather than in memory: Vercel runs many function instances, and
 * an in-process counter would let an attacker spread requests across them and hit
 * nothing. The SQL side is a single `INSERT … ON CONFLICT DO UPDATE … RETURNING`, so
 * two concurrent submissions cannot both read a stale count and both pass.
 */

/**
 * Best-effort caller IP.
 *
 * `x-forwarded-for` is a client-settable header, so this value is *not* trustworthy in
 * general — on Vercel the platform overwrites it with the real edge-observed address,
 * which is what makes it usable here. It must never be used for authorisation, only
 * for throttling, where the worst case of a spoofed value is that an attacker throttles
 * a bucket nobody else is using.
 */
export async function callerIp(): Promise<string | null> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return headerList.get('x-real-ip');
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('consume_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // Fail OPEN, deliberately. If the limiter itself is broken, the alternative is
    // refusing every genuine application during a competition deadline — a far worse
    // outcome than briefly losing throttling. The error is logged so it is not silent.
    console.error('[rate-limit] unavailable, allowing request:', error.message);
    return true;
  }

  return data !== false;
}

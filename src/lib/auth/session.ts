import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';

import { createServerSupabase } from '@/lib/supabase/server';
import type { AppRole } from '@/types/database.types';

import { can, type Permission } from './rbac';

export interface StaffSession {
  userId: string;
  email: string;
  fullName: string;
  role: AppRole;
  avatarPath: string | null;
}

/**
 * The signed-in staff member, or `null`.
 *
 * Uses `getUser()`, never `getSession()`. `getSession()` only decodes the cookie, which
 * the client controls and could forge; `getUser()` revalidates the JWT against Supabase.
 * The difference is the whole security boundary — see the same note in `middleware.ts`.
 *
 * An account with `is_active = false` is treated as signed out. That is what makes
 * deactivating a departing staff member take effect on their next request rather than
 * whenever their token happens to expire.
 *
 * Memoised per request, so the admin layout, the sidebar and a Server Action in the
 * same render pay for one round trip.
 */
/**
 * Short-lived profile cache, keyed by user id.
 *
 * Resolving a session costs two *sequential* round trips — `getUser()` cannot be
 * parallelised with the profile lookup because the lookup needs the id it returns.
 * Against this project's Supabase instance that is roughly 900ms before an admin page
 * starts rendering, on every navigation.
 *
 * `getUser()` is never cached: it is the security check, and a revoked or expired token
 * must stop working immediately. Only the profile row — role, name, active flag — is
 * held, and only for a few seconds.
 *
 * The consequence is bounded and deliberate: deactivating a staff member or changing
 * their role takes effect within `PROFILE_TTL_MS` rather than instantly. Fifteen
 * seconds is short enough that it cannot be exploited in practice and long enough to
 * cover a burst of navigation. RLS still refuses the rows regardless of what this
 * cache believes, so a stale role cannot read data the database will not hand over.
 *
 * A plain module-level Map, not `unstable_cache`: this is per-user data that must never
 * be shared, and the value should die with the process rather than persist to disk.
 */
const PROFILE_TTL_MS = 15_000;

interface CachedProfile {
  expires: number;
  value: StaffSession | null;
}

const profileCache = new Map<string, CachedProfile>();

function readProfileCache(userId: string): CachedProfile | undefined {
  const hit = profileCache.get(userId);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    profileCache.delete(userId);
    return undefined;
  }
  return hit;
}

/** Drop a cached profile immediately — call after changing a role or deactivating. */
export function invalidateStaffSession(userId?: string) {
  if (userId) profileCache.delete(userId);
  else profileCache.clear();
}

export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const cached = readProfileCache(user.id);
  if (cached) return cached.value;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active, avatar_path')
    .eq('id', user.id)
    .single();

  const value: StaffSession | null =
    error || !profile || !profile.is_active
      ? null
      : {
          userId: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          role: profile.role,
          avatarPath: profile.avatar_path,
        };

  profileCache.set(user.id, { expires: Date.now() + PROFILE_TTL_MS, value });
  return value;
});

/**
 * Session or bust. Redirects to the login screen, preserving where the caller was
 * heading so login can return them there.
 */
export async function requireStaffSession(next?: string): Promise<StaffSession> {
  const session = await getStaffSession();
  if (session) return session;

  const target = next ? `/admin/login?next=${encodeURIComponent(next)}` : '/admin/login';
  redirect(target);
}

/**
 * Permission or bust. Call at the top of every Server Action that mutates, not only in
 * the page that renders the button — an action is a public endpoint, and hiding its
 * trigger in the UI protects nobody who can use `curl`.
 */
export async function requirePermission(permission: Permission): Promise<StaffSession> {
  const session = await requireStaffSession();

  if (!can(session.role, permission)) {
    // A signed-in user who lacks a permission gets 403, not a login redirect: they are
    // authenticated, just not authorised, and bouncing them to a login form they have
    // already passed is a confusing dead end.
    redirect('/admin/forbidden');
  }

  return session;
}

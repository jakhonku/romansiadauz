'use server';

import { revalidatePath } from 'next/cache';

import { invalidateStaffSession, requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import type { AppRole } from '@/types/database.types';

export type UserActionResult = { ok: true } | { ok: false; message: string };

const ROLES: AppRole[] = ['admin', 'editor', 'moderator', 'viewer'];

/**
 * Change a staff member's role.
 *
 * Two guards beyond the permission check, both about the same failure: an
 * administrator locking every administrator out of the panel.
 *
 *   1. You cannot change your own role. Demoting yourself is the single most common way
 *      to end up with a panel nobody can administer.
 *   2. The last active admin cannot be demoted. Counted in the same request rather than
 *      trusted from the UI, because the UI's count can be stale by seconds.
 *
 * Recovering from either would mean a manual UPDATE in the Supabase dashboard.
 */
export async function setUserRole(userId: string, role: string): Promise<UserActionResult> {
  const session = await requirePermission('users.manage');

  if (!(ROLES as string[]).includes(role)) return { ok: false, message: 'invalid_role' };
  if (userId === session.userId) return { ok: false, message: 'self_role_change' };

  const supabase = await createServerSupabase();

  if (role !== 'admin') {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('is_active', true);

    const { data: target } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (target?.role === 'admin' && target.is_active && (count ?? 0) <= 1) {
      return { ok: false, message: 'last_admin' };
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: role as AppRole })
    .eq('id', userId);

  if (error) {
    console.error('[admin:users:role]', error.message);
    return { ok: false, message: error.message };
  }

  // The 15s profile cache in `session.ts` would otherwise keep serving the old role.
  // A demotion has to bite immediately, not eventually.
  invalidateStaffSession(userId);
  revalidatePath('/admin/users');
  return { ok: true };
}

/** Activate or deactivate an account. Same last-admin and self-lockout guards. */
export async function setUserActive(userId: string, isActive: boolean): Promise<UserActionResult> {
  const session = await requirePermission('users.manage');

  if (userId === session.userId) return { ok: false, message: 'self_deactivate' };

  const supabase = await createServerSupabase();

  if (!isActive) {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('is_active', true);

    const { data: target } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (target?.role === 'admin' && (count ?? 0) <= 1) {
      return { ok: false, message: 'last_admin' };
    }
  }

  const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', userId);

  if (error) {
    console.error('[admin:users:active]', error.message);
    return { ok: false, message: error.message };
  }

  // Deactivation must take effect on the very next request.
  invalidateStaffSession(userId);
  revalidatePath('/admin/users');
  return { ok: true };
}

/**
 * Invite a staff member by e-mail.
 *
 * Uses the service-role client because `auth.admin.inviteUserByEmail` is a privileged
 * operation with no user-level equivalent. Supabase sends the invitation; the profile
 * row is created by the `on_auth_user_created` trigger in 0001, so the role is applied
 * afterwards rather than raced against it.
 */
export async function inviteUser(
  email: string,
  fullName: string,
  role: string,
): Promise<UserActionResult> {
  await requirePermission('users.manage');

  const address = email.trim().toLowerCase();
  if (!address || !address.includes('@')) return { ok: false, message: 'invalid_email' };
  if (!(ROLES as string[]).includes(role)) return { ok: false, message: 'invalid_role' };

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(address, {
    data: { full_name: fullName.trim() || address },
  });

  if (error || !data.user) {
    console.error('[admin:users:invite]', error?.message);
    return { ok: false, message: error?.message ?? 'invite_failed' };
  }

  const { error: roleError } = await admin
    .from('profiles')
    .update({ role: role as AppRole, full_name: fullName.trim() || address })
    .eq('id', data.user.id);

  if (roleError) {
    console.error('[admin:users:invite-role]', roleError.message);
    return { ok: false, message: roleError.message };
  }

  revalidatePath('/admin/users');
  return { ok: true };
}

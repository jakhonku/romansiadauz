'use server';

import { revalidatePath } from 'next/cache';

import { requirePermission } from '@/lib/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import type { RegistrationStatus } from '@/types/database.types';

export type ReviewResult = { ok: true } | { ok: false; message: string };

/**
 * Approve or reject an application.
 *
 * `requirePermission` runs first, before anything reads the arguments. A Server Action
 * is a public HTTP endpoint — the reviewer buttons being hidden from an editor's UI
 * protects nobody who can craft a POST. RLS is the third and final gate: a moderator's
 * session simply cannot UPDATE a row the policy excludes.
 *
 * `reviewed_at` and `reviewed_by` are stamped by the trigger in 0004, not here, so the
 * audit trail stays truthful even if a future caller forgets to set them.
 */
export async function reviewRegistration(
  id: string,
  status: Exclude<RegistrationStatus, 'pending'>,
  note: string,
): Promise<ReviewResult> {
  await requirePermission('registrations.review');

  if (!id) return { ok: false, message: 'missing_id' };

  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from('registrations')
    .update({
      status,
      review_note: note.trim() ? note.trim().slice(0, 2000) : null,
    })
    .eq('id', id);

  if (error) {
    console.error('[admin:review]', error.message);
    return { ok: false, message: error.message };
  }

  revalidatePath('/admin/registrations');
  revalidatePath(`/admin/registrations/${id}`);
  revalidatePath('/admin');

  return { ok: true };
}

/**
 * Return an application to `pending`.
 *
 * The trigger clears `reviewed_at` and `reviewed_by` on the way back, so a re-opened
 * application does not keep claiming it was decided by someone.
 */
export async function reopenRegistration(id: string): Promise<ReviewResult> {
  await requirePermission('registrations.review');

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from('registrations')
    .update({ status: 'pending', review_note: null })
    .eq('id', id);

  if (error) {
    console.error('[admin:reopen]', error.message);
    return { ok: false, message: error.message };
  }

  revalidatePath('/admin/registrations');
  revalidatePath(`/admin/registrations/${id}`);
  revalidatePath('/admin');

  return { ok: true };
}

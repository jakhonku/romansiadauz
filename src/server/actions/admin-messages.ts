'use server';

import { revalidatePath } from 'next/cache';

import { requirePermission } from '@/lib/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';

export type MessageActionResult = { ok: true } | { ok: false; message: string };

async function update(
  id: string,
  patch: { is_read?: boolean; is_archived?: boolean },
): Promise<MessageActionResult> {
  await requirePermission('messages.review');

  const supabase = await createServerSupabase();
  const { error } = await supabase.from('contact_messages').update(patch).eq('id', id);

  if (error) {
    console.error('[admin:messages]', error.message);
    return { ok: false, message: error.message };
  }

  revalidatePath('/admin/messages');
  revalidatePath('/admin');
  return { ok: true };
}

export async function setMessageRead(id: string, isRead: boolean) {
  return update(id, { is_read: isRead });
}

/**
 * Archiving also marks as read.
 *
 * Otherwise a message filed away without being opened stays in the unread counter
 * forever, and the badge in the sidebar stops meaning anything.
 */
export async function setMessageArchived(id: string, isArchived: boolean) {
  return update(id, isArchived ? { is_archived: true, is_read: true } : { is_archived: false });
}

import 'server-only';

import { createServerSupabase } from '@/lib/supabase/server';

export interface MessageItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
  locale: string;
}

export interface MessageListResult {
  items: MessageItem[];
  total: number;
  unread: number;
  page: number;
  pageCount: number;
}

interface Row {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
  locale: string;
}

/**
 * Contact messages for the moderator inbox.
 *
 * Session client, so RLS decides visibility — see the note in `admin-registrations.ts`.
 * Archived messages are excluded by default: the inbox is a work queue, and a queue
 * that keeps everything ever handled stops being one.
 */
export async function listMessages({
  archived = false,
  unreadOnly = false,
  page = 1,
  perPage = 25,
}: {
  archived?: boolean;
  unreadOnly?: boolean;
  page?: number;
  perPage?: number;
} = {}): Promise<MessageListResult> {
  const supabase = await createServerSupabase();
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const from = (safePage - 1) * perPage;

  let query = supabase
    .from('contact_messages')
    .select('id, name, email, phone, subject, message, is_read, is_archived, created_at, locale', {
      count: 'exact',
    })
    .eq('is_archived', archived)
    .order('created_at', { ascending: false })
    .range(from, from + perPage - 1);

  if (unreadOnly) query = query.eq('is_read', false);

  const [{ data, error, count }, unreadResult] = await Promise.all([
    query.returns<Row[]>(),
    supabase
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .eq('is_archived', false)
      .eq('is_read', false),
  ]);

  if (error) {
    console.warn(`[admin:messages] ${error.message}`);
    return { items: [], total: 0, unread: 0, page: safePage, pageCount: 1 };
  }

  return {
    items: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      subject: row.subject,
      message: row.message,
      isRead: row.is_read,
      isArchived: row.is_archived,
      createdAt: row.created_at,
      locale: row.locale,
    })),
    total: count ?? 0,
    unread: unreadResult.count ?? 0,
    page: safePage,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / perPage)),
  };
}

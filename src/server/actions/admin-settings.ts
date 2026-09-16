'use server';

import { revalidatePath } from 'next/cache';

import { requirePermission } from '@/lib/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Json } from '@/types/database.types';

export type SettingsResult = { ok: true } | { ok: false; message: string };

/**
 * The JSONB column groups on the singleton `site_settings` row.
 *
 * Not exported, and it must stay that way: a `'use server'` module may only export
 * async functions, because every export becomes a callable endpoint. Exporting this
 * array made `/admin/settings` fail to render at all: a "use server" file can only
 * export async functions, found object. Type exports are erased before that check and
 * are fine; runtime values are not. If another module ever needs this list, move it to
 * its own plain module rather than exporting it from here.
 */
const SETTINGS_GROUPS = ['branding', 'contacts', 'social', 'seo', 'analytics', 'stats'] as const;
export type SettingsGroup = (typeof SETTINGS_GROUPS)[number];

/**
 * Save one group of site settings.
 *
 * `smtp` is deliberately absent from `SETTINGS_GROUPS`. It holds a mail password, and
 * 0007 revokes the column from `anon` and `authenticated` entirely — editing it through
 * this action would mean granting the column back. Mail credentials belong in
 * environment variables, where they are never in a database a leaked key can read.
 *
 * An UPDATE, not an upsert. Migration 0005 seeds the singleton row pinned to `id = 1`
 * by a CHECK constraint, so it always exists — and 0009 grants `authenticated` only
 * column-level UPDATE on this table, never INSERT. An upsert compiles to
 * `INSERT … ON CONFLICT DO UPDATE`, which Postgres refuses outright with "permission
 * denied for table site_settings" no matter that the conflict branch is the one that
 * would have run. Keeping this an UPDATE also keeps a second settings row impossible.
 */
export async function saveSettingsGroup(
  group: string,
  values: Record<string, unknown>,
): Promise<SettingsResult> {
  const session = await requirePermission('settings.manage');

  if (!(SETTINGS_GROUPS as readonly string[]).includes(group)) {
    return { ok: false, message: 'unknown_group' };
  }

  const supabase = await createServerSupabase();

  // A computed key widens to a broad index signature, which supabase-js's
  // excess-property check rejects. The key is guarded against `SETTINGS_GROUPS` above,
  // so it is always a real JSONB column.
  const patch: Record<string, unknown> = { [group]: values as Json, updated_by: session.userId };

  const { error, count } = await supabase
    .from('site_settings')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(patch as any, { count: 'exact' })
    .eq('id', 1);

  if (error) {
    console.error('[admin:settings]', error.message);
    return { ok: false, message: error.message };
  }

  // Zero rows is not an error to PostgREST, but it means the seeded singleton is gone
  // and the save silently did nothing — which is exactly the failure an administrator
  // must not be told was a success.
  if (count === 0) {
    console.error('[admin:settings] no site_settings row with id = 1 — run migration 0005');
    return { ok: false, message: 'settings_row_missing' };
  }

  // Contact details and statistics appear in the footer and on the home page, so every
  // public route can be affected.
  revalidatePath('/[locale]', 'page');
  revalidatePath('/[locale]/contact', 'page');
  revalidatePath('/admin/settings');

  return { ok: true };
}

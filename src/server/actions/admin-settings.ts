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
 * The row is a singleton pinned to `id = 1` by a CHECK constraint, so this upserts
 * rather than inserting — a fresh project has no row until the first save.
 */
export async function saveSettingsGroup(
  group: string,
  values: Record<string, unknown>,
): Promise<SettingsResult> {
  await requirePermission('settings.manage');

  if (!(SETTINGS_GROUPS as readonly string[]).includes(group)) {
    return { ok: false, message: 'unknown_group' };
  }

  const supabase = await createServerSupabase();

  // A computed key widens to a broad index signature, which supabase-js's
  // excess-property check rejects. The key is guarded against `SETTINGS_GROUPS` above,
  // so it is always a real JSONB column.
  const patch: Record<string, unknown> = { id: 1, [group]: values as Json };

  const { error } = await supabase
    .from('site_settings')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(patch as any, { onConflict: 'id' });

  if (error) {
    console.error('[admin:settings]', error.message);
    return { ok: false, message: error.message };
  }

  // Contact details and statistics appear in the footer and on the home page, so every
  // public route can be affected.
  revalidatePath('/[locale]', 'page');
  revalidatePath('/[locale]/contact', 'page');
  revalidatePath('/admin/settings');

  return { ok: true };
}

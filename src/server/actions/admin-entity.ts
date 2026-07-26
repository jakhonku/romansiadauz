'use server';

import { revalidatePath } from 'next/cache';

import { getEntity, type EntityConfig } from '@/lib/admin/entities';
import { requirePermission } from '@/lib/auth/session';
import { locales } from '@/lib/i18n/config';
import { createServerSupabase } from '@/lib/supabase/server';
import { sanitizeHtml } from '@/lib/utils/sanitize';
import { toSlugOrFallback } from '@/lib/utils/slug';
import { syncTranslations } from '@/server/actions/translation-sync';
import type { LocaleCode } from '@/types/database.types';

export type EntitySaveResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'invalid' | 'duplicate_slug' | 'unknown_entity' | 'error'; message?: string };

const UNIQUE_VIOLATION = '23505';

export interface EntityPayload {
  entityKey: string;
  id?: string;
  slug?: string;
  status?: string;
  sortOrder?: number;
  base: Record<string, string | boolean>;
  translations: Record<string, Record<string, string>>;
}

/**
 * Coerce a form value to what the column expects.
 *
 * Everything arrives from the browser as a string. An empty numeric input must become
 * `null`, not `0` — a winner with no placing is not a winner who placed zeroth, and
 * `''` would be rejected by the column type outright.
 */
function coerce(config: EntityConfig, name: string, value: string | boolean): unknown {
  const field = config.baseFields.find((f) => f.name === name);
  if (!field) return null;

  switch (field.type) {
    case 'checkbox':
      return Boolean(value);
    case 'number': {
      const text = String(value).trim();
      if (!text) return null;
      const parsed = Number(text);
      return Number.isFinite(parsed) ? parsed : null;
    }
    case 'date':
    case 'datetime': {
      const text = String(value).trim();
      if (!text) return null;
      const date = new Date(text);
      if (Number.isNaN(date.getTime())) return null;
      // A `date` column wants a bare calendar day; a timestamptz wants the instant.
      return field.type === 'date' ? date.toISOString().slice(0, 10) : date.toISOString();
    }
    default: {
      const text = String(value).trim();
      return text || null;
    }
  }
}

/**
 * Invalidate the public routes an entity feeds.
 *
 * Coarse on purpose: these records appear on the home page as well as their own
 * section, and working out precisely which sections a given partner touches is more
 * fragile than clearing the handful of routes involved.
 */
function revalidateEntity(config: EntityConfig, slug?: string) {
  revalidatePath('/[locale]', 'page');

  const publicPath: Record<string, string> = {
    judges: '/[locale]/judges',
    winners: '/[locale]/winners',
    partners: '/[locale]',
    events: '/[locale]',
    pages: '/[locale]/p/[slug]',
    videos: '/[locale]/videos',
    gallery: '/[locale]/gallery',
  };

  const path = publicPath[config.key];
  if (path) revalidatePath(path, 'page');

  if (config.key === 'gallery') revalidatePath('/[locale]/gallery/[slug]', 'page');
  if (config.key === 'pages' && slug) revalidatePath(`/[locale]/p/${slug}`, 'page');
  if (config.key === 'about') revalidatePath('/[locale]/about', 'page');

  revalidatePath('/sitemap.xml');
  revalidatePath(`/admin/${config.key}`);
}

export async function saveEntity(payload: EntityPayload): Promise<EntitySaveResult> {
  await requirePermission('content.manage');

  const config = getEntity(payload.entityKey);
  if (!config) return { ok: false, reason: 'unknown_entity' };

  // The required translation field in the default locale is the record's name in every
  // list; without it the row shows as a blank line everywhere.
  const requiredField = config.translationFields.find((f) => f.required);
  const defaultTitle = requiredField
    ? payload.translations.uz?.[requiredField.name]?.trim()
    : 'ok';
  if (!defaultTitle) return { ok: false, reason: 'invalid' };

  const supabase = await createServerSupabase();

  const row: Record<string, unknown> = {};
  for (const field of config.baseFields) {
    row[field.name] = coerce(config, field.name, payload.base[field.name] ?? '');
  }
  if (config.hasStatus) row.status = payload.status ?? 'draft';
  if (config.hasSortOrder) row.sort_order = payload.sortOrder ?? 0;

  const slug = config.hasSlug
    ? payload.slug?.trim() || toSlugOrFallback(defaultTitle, config.key)
    : undefined;
  if (config.hasSlug) row.slug = slug;

  let id = payload.id;

  if (id) {
    // The table name is a runtime union, so supabase-js cannot narrow the row type from
    // it. The values were built field-by-field from `config.baseFields` and coerced by
    // `coerce()` just above, which is where the real checking happens.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from(config.table).update(row as any).eq('id', id);
    if (error) {
      if (error.code === UNIQUE_VIOLATION) return { ok: false, reason: 'duplicate_slug' };
      console.error(`[admin:${config.key}:update]`, error.message);
      return { ok: false, reason: 'error', message: error.message };
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.from(config.table).insert(row as any).select('id').single();
    if (error || !data) {
      if (error?.code === UNIQUE_VIOLATION) return { ok: false, reason: 'duplicate_slug' };
      console.error(`[admin:${config.key}:insert]`, error?.message);
      return { ok: false, reason: 'error', message: error?.message };
    }
    id = (data as { id: string }).id;
  }

  const translationRows = locales
    .filter((locale) => payload.translations[locale]?.[requiredField?.name ?? '']?.trim())
    .map((locale) => {
      const source = payload.translations[locale]!;
      const out: Record<string, unknown> & { locale: LocaleCode } = { locale };

      for (const field of config.translationFields) {
        const value = (source[field.name] ?? '').trim();
        // Rich text is sanitised on write as well as on render — ARCHITECTURE §6.
        out[field.name] = field.type === 'richtext' ? sanitizeHtml(value) : value || null;
      }

      // A NOT NULL translation column cannot take null; the required field always has
      // a value here because the filter above guaranteed it.
      if (requiredField) out[requiredField.name] = source[requiredField.name]!.trim();

      return out;
    });

  const syncError = await syncTranslations(
    supabase,
    config.translationTable,
    config.foreignKey,
    id!,
    translationRows,
  );

  if (syncError) return { ok: false, reason: 'error', message: syncError };

  revalidateEntity(config, slug);
  return { ok: true, id: id! };
}

export async function deleteEntity(
  entityKey: string,
  id: string,
  slug?: string,
): Promise<EntitySaveResult> {
  await requirePermission('content.manage');

  const config = getEntity(entityKey);
  if (!config) return { ok: false, reason: 'unknown_entity' };

  const supabase = await createServerSupabase();
  // Translations follow: every `*_translations.<parent>_id` is ON DELETE CASCADE.
  const { error } = await supabase.from(config.table).delete().eq('id', id);

  if (error) {
    console.error(`[admin:${config.key}:delete]`, error.message);
    return { ok: false, reason: 'error', message: error.message };
  }

  revalidateEntity(config, slug);
  return { ok: true, id };
}

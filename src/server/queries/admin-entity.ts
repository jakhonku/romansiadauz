import 'server-only';

import type { EntityConfig } from '@/lib/admin/entities';
import type { Locale } from '@/lib/i18n/config';
import { createServerSupabase } from '@/lib/supabase/server';
import { pickTranslation } from '@/server/queries/shared';
import type { ContentStatus, LocaleCode } from '@/types/database.types';

/**
 * Generic reads for the descriptor-driven admin modules.
 *
 * Session client throughout, so RLS decides what an editor may see — same posture as
 * every other admin query.
 */

export interface EntityListItem {
  id: string;
  title: string;
  slug: string | null;
  status: ContentStatus | null;
  sortOrder: number | null;
  updatedAt: string | null;
  translatedLocales: LocaleCode[];
  /** Values for `config.listColumns`, already stringified. */
  extras: Record<string, string>;
}

/** Build the PostgREST select list from the descriptor, so it never drifts from it. */
function selectFor(config: EntityConfig): string {
  const columns = ['id'];
  if (config.hasSlug) columns.push('slug');
  if (config.hasStatus) columns.push('status');
  if (config.hasSortOrder) columns.push('sort_order');
  columns.push('updated_at');

  for (const field of config.baseFields) columns.push(field.name);
  for (const extra of config.listColumns ?? []) {
    if (!columns.includes(extra.column)) columns.push(extra.column);
  }

  const translationColumns = ['locale', ...config.translationFields.map((f) => f.name)];
  columns.push(`translations:${config.translationTable} ( ${translationColumns.join(', ')} )`);

  return columns.join(', ');
}

type Raw = Record<string, unknown> & {
  id: string;
  translations: (Record<string, unknown> & { locale: LocaleCode })[] | null;
};

export async function listEntity(
  config: EntityConfig,
  locale: Locale,
): Promise<EntityListItem[]> {
  const supabase = await createServerSupabase();

  let query = supabase.from(config.table).select(selectFor(config));
  for (const order of config.orderBy) {
    query = query.order(order.column, { ascending: order.ascending, nullsFirst: false });
  }

  const { data, error } = await query;

  if (error) {
    console.warn(`[admin:${config.key}] ${error.message}`);
    return [];
  }

  return (data ?? []).map((entry) => {
    const row = entry as unknown as Raw;
    const translation = pickTranslation(row.translations, locale);

    const extras: Record<string, string> = {};
    for (const extra of config.listColumns ?? []) {
      const value = row[extra.column];
      extras[extra.column] = value === null || value === undefined ? '' : String(value);
    }

    return {
      id: row.id,
      title:
        (translation?.[config.titleColumn] as string | undefined)?.trim() ||
        (row.slug as string | undefined) ||
        row.id,
      slug: (row.slug as string | undefined) ?? null,
      status: (row.status as ContentStatus | undefined) ?? null,
      sortOrder: (row.sort_order as number | undefined) ?? null,
      updatedAt: (row.updated_at as string | undefined) ?? null,
      translatedLocales: (row.translations ?? [])
        .filter((t) => String(t[config.titleColumn] ?? '').trim())
        .map((t) => t.locale),
      extras,
    };
  });
}

export interface EntityRecord {
  id: string;
  slug: string;
  status: ContentStatus;
  sortOrder: number;
  /** Base column values, stringified for form inputs. */
  base: Record<string, string | boolean>;
  /** `translations[locale][column]`. */
  translations: Record<LocaleCode, Record<string, string>>;
}

function blankTranslations(config: EntityConfig): Record<LocaleCode, Record<string, string>> {
  const blank = () =>
    Object.fromEntries(config.translationFields.map((f) => [f.name, ''])) as Record<string, string>;
  return { uz: blank(), ru: blank(), en: blank() };
}

export function emptyEntityRecord(config: EntityConfig): EntityRecord {
  const base: Record<string, string | boolean> = {};
  for (const field of config.baseFields) {
    base[field.name] = field.type === 'checkbox' ? false : '';
  }

  return {
    id: '',
    slug: '',
    status: 'draft',
    sortOrder: 0,
    base,
    translations: blankTranslations(config),
  };
}

export async function getEntityRecord(
  config: EntityConfig,
  id: string,
): Promise<EntityRecord | null> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from(config.table)
    .select(selectFor(config))
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.warn(`[admin:${config.key}:detail] ${error.message}`);
    return null;
  }

  const row = data as unknown as Raw;

  const base: Record<string, string | boolean> = {};
  for (const field of config.baseFields) {
    const value = row[field.name];
    if (field.type === 'checkbox') {
      base[field.name] = Boolean(value);
    } else {
      base[field.name] = value === null || value === undefined ? '' : String(value);
    }
  }

  // Every locale must be present — the form binds a controlled input per locale, and a
  // missing key flips React from uncontrolled to controlled mid-edit.
  const translations = blankTranslations(config);
  for (const t of row.translations ?? []) {
    for (const field of config.translationFields) {
      translations[t.locale][field.name] = String(t[field.name] ?? '');
    }
  }

  return {
    id: row.id,
    slug: (row.slug as string | undefined) ?? '',
    status: (row.status as ContentStatus | undefined) ?? 'draft',
    sortOrder: (row.sort_order as number | undefined) ?? 0,
    base,
    translations,
  };
}

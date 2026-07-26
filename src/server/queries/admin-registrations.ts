import 'server-only';

import { createServerSupabase } from '@/lib/supabase/server';
import type { Locale } from '@/lib/i18n/config';
import type { RegistrationStatus } from '@/types/database.types';

/**
 * Admin reads for festival applications.
 *
 * Everything here goes through the **session** client, never the service-role one. RLS
 * (0007) already restricts these rows to `admin` and `moderator`; running the admin UI
 * under the caller's own rights means a permission bug shows up as an empty table
 * rather than as a moderator quietly reading rows they should not.
 */

export interface RegistrationListItem {
  id: string;
  referenceCode: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  nominationName: string | null;
  status: RegistrationStatus;
  createdAt: string;
}

export interface RegistrationListResult {
  items: RegistrationListItem[];
  total: number;
  page: number;
  pageCount: number;
}

export interface RegistrationFilters {
  status?: RegistrationStatus;
  search?: string;
  page?: number;
  perPage?: number;
}

const nameColumn: Record<Locale, 'name_uz' | 'name_ru' | 'name_en'> = {
  uz: 'name_uz',
  ru: 'name_ru',
  en: 'name_en',
};

const LIST_SELECT = `
  id, reference_code, first_name, last_name, middle_name, birth_date,
  email, phone, status, created_at,
  nomination:nominations ( name_uz, name_ru, name_en )
` as const;

interface ListRow {
  id: string;
  reference_code: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  birth_date: string;
  email: string;
  phone: string;
  status: RegistrationStatus;
  created_at: string;
  nomination: { name_uz: string; name_ru: string; name_en: string } | null;
}

/** Escape PostgREST's `or()` mini-language: `,` separates terms and `)` closes the group. */
function escapeFilterTerm(value: string): string {
  return value.replace(/[,()\\]/g, ' ').trim();
}

export async function listRegistrations(
  locale: Locale,
  { status, search, page = 1, perPage = 25 }: RegistrationFilters = {},
): Promise<RegistrationListResult> {
  const supabase = await createServerSupabase();
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const from = (safePage - 1) * perPage;

  let query = supabase
    .from('registrations')
    .select(LIST_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + perPage - 1);

  if (status) query = query.eq('status', status);

  const term = search ? escapeFilterTerm(search) : '';
  if (term) {
    // Backed by the GIN trigram indexes in 0006 — without them this is a sequential
    // scan of every application on every keystroke.
    const like = `%${term}%`;
    query = query.or(
      [
        `first_name.ilike.${like}`,
        `last_name.ilike.${like}`,
        `email.ilike.${like}`,
        `phone.ilike.${like}`,
        `reference_code.ilike.${like}`,
      ].join(','),
    );
  }

  const { data, error, count } = await query.returns<ListRow[]>();

  if (error) {
    console.warn(`[admin:registrations] ${error.message}`);
    return { items: [], total: 0, page: safePage, pageCount: 1 };
  }

  const column = nameColumn[locale];

  return {
    items: (data ?? []).map((row) => ({
      id: row.id,
      referenceCode: row.reference_code,
      fullName: [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' '),
      email: row.email,
      phone: row.phone,
      birthDate: row.birth_date,
      nominationName: row.nomination ? row.nomination[column] : null,
      status: row.status,
      createdAt: row.created_at,
    })),
    total: count ?? 0,
    page: safePage,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / perPage)),
  };
}

export interface RegistrationDetail extends RegistrationListItem {
  firstName: string;
  lastName: string;
  middleName: string | null;
  institution: string | null;
  faculty: string | null;
  positionTitle: string | null;
  address: string;
  programmeRound1: string | null;
  programmeRound2: string | null;
  programmeRound3: string | null;
  accompanistName: string | null;
  accompanistWorkplace: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewerName: string | null;
  locale: string;
}

/** Shape of the full-detail select, shared by the detail view and the export. */
interface DetailRow extends ListRow {
  institution: string | null;
  faculty: string | null;
  position_title: string | null;
  address: string;
  programme_round_1: string | null;
  programme_round_2: string | null;
  programme_round_3: string | null;
  accompanist_name: string | null;
  accompanist_workplace: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  locale: string;
  reviewer: { full_name: string } | null;
}

export async function getRegistration(
  locale: Locale,
  id: string,
): Promise<RegistrationDetail | null> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('registrations')
    .select(
      `id, reference_code, first_name, last_name, middle_name, birth_date,
       institution, faculty, position_title, address, email, phone,
       programme_round_1, programme_round_2, programme_round_3,
       accompanist_name, accompanist_workplace,
       status, review_note, reviewed_at, created_at, locale,
       nomination:nominations ( name_uz, name_ru, name_en ),
       reviewer:profiles!registrations_reviewed_by_fkey ( full_name )`,
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.warn(`[admin:registration] ${error.message}`);
    return null;
  }

  const row = data as unknown as DetailRow;
  const column = nameColumn[locale];

  return {
    id: row.id,
    referenceCode: row.reference_code,
    fullName: [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' '),
    firstName: row.first_name,
    lastName: row.last_name,
    middleName: row.middle_name,
    email: row.email,
    phone: row.phone,
    birthDate: row.birth_date,
    institution: row.institution,
    faculty: row.faculty,
    positionTitle: row.position_title,
    address: row.address,
    programmeRound1: row.programme_round_1,
    programmeRound2: row.programme_round_2,
    programmeRound3: row.programme_round_3,
    accompanistName: row.accompanist_name,
    accompanistWorkplace: row.accompanist_workplace,
    nominationName: row.nomination ? row.nomination[column] : null,
    status: row.status,
    reviewNote: row.review_note,
    reviewedAt: row.reviewed_at,
    reviewerName: row.reviewer?.full_name ?? null,
    createdAt: row.created_at,
    locale: row.locale,
  };
}

/**
 * Every matching application, unpaginated, for the spreadsheet export.
 *
 * One query with all the columns — emphatically not "list the ids, then fetch each
 * row", which would be two thousand round trips for one button press.
 *
 * The 2000-row ceiling is deliberate: it covers several festival seasons, and an
 * unbounded export is the classic way to run a serverless function out of memory.
 */
export const EXPORT_ROW_LIMIT = 2000;

export async function listRegistrationsForExport(
  locale: Locale,
  { status, search }: Omit<RegistrationFilters, 'page' | 'perPage'> = {},
): Promise<RegistrationDetail[]> {
  const supabase = await createServerSupabase();

  let query = supabase
    .from('registrations')
    .select(
      `id, reference_code, first_name, last_name, middle_name, birth_date,
       institution, faculty, position_title, address, email, phone,
       programme_round_1, programme_round_2, programme_round_3,
       accompanist_name, accompanist_workplace,
       status, review_note, reviewed_at, created_at, locale,
       nomination:nominations ( name_uz, name_ru, name_en ),
       reviewer:profiles!registrations_reviewed_by_fkey ( full_name )`,
    )
    .order('created_at', { ascending: false })
    .limit(EXPORT_ROW_LIMIT);

  if (status) query = query.eq('status', status);

  const term = search ? escapeFilterTerm(search) : '';
  if (term) {
    const like = `%${term}%`;
    query = query.or(
      [
        `first_name.ilike.${like}`,
        `last_name.ilike.${like}`,
        `email.ilike.${like}`,
        `phone.ilike.${like}`,
        `reference_code.ilike.${like}`,
      ].join(','),
    );
  }

  const { data, error } = await query;

  if (error) {
    console.warn(`[admin:registrations-export] ${error.message}`);
    return [];
  }

  const column = nameColumn[locale];

  return (data ?? []).map((raw) => {
    const row = raw as unknown as DetailRow;
    return {
      id: row.id,
      referenceCode: row.reference_code,
      fullName: [row.last_name, row.first_name, row.middle_name].filter(Boolean).join(' '),
      firstName: row.first_name,
      lastName: row.last_name,
      middleName: row.middle_name,
      email: row.email,
      phone: row.phone,
      birthDate: row.birth_date,
      institution: row.institution,
      faculty: row.faculty,
      positionTitle: row.position_title,
      address: row.address,
      programmeRound1: row.programme_round_1,
      programmeRound2: row.programme_round_2,
      programmeRound3: row.programme_round_3,
      accompanistName: row.accompanist_name,
      accompanistWorkplace: row.accompanist_workplace,
      nominationName: row.nomination ? row.nomination[column] : null,
      status: row.status,
      reviewNote: row.review_note,
      reviewedAt: row.reviewed_at,
      reviewerName: row.reviewer?.full_name ?? null,
      createdAt: row.created_at,
      locale: row.locale,
    };
  });
}

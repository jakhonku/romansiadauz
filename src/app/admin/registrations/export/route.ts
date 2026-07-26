import ExcelJS from 'exceljs';
import { NextResponse, type NextRequest } from 'next/server';

import { getAdminLocale } from '@/lib/auth/admin-locale';
import { can } from '@/lib/auth/rbac';
import { getStaffSession } from '@/lib/auth/session';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { listRegistrationsForExport } from '@/server/queries/admin-registrations';
import type { RegistrationStatus } from '@/types/database.types';

/**
 * Spreadsheet export of the current filter.
 *
 * A route handler rather than a Server Action because the response is a *file*: actions
 * return serialisable values, not streams with a `Content-Disposition`.
 *
 * Permission is re-checked here from scratch. This URL is guessable and sits outside
 * the `(dashboard)` group, so it cannot lean on that layout's guard — an editor hitting
 * it directly must get a 403, not a spreadsheet of applicants' contact details.
 */
export const dynamic = 'force-dynamic';

const STATUSES: RegistrationStatus[] = ['pending', 'approved', 'rejected'];

function isStatus(value: string | null): value is RegistrationStatus {
  return value !== null && (STATUSES as string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const session = await getStaffSession();
  if (!session) return new NextResponse('Unauthorized', { status: 401 });
  if (!can(session.role, 'registrations.review')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const locale = await getAdminLocale();
  const d = await getDictionary(locale);
  const r = d.admin.registrations;

  const statusParam = request.nextUrl.searchParams.get('status');
  const rows = await listRegistrationsForExport(locale, {
    status: isStatus(statusParam) ? statusParam : undefined,
    search: request.nextUrl.searchParams.get('q') ?? undefined,
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = d.meta.siteName;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(r.title.slice(0, 31));

  sheet.columns = [
    { header: r.reference, key: 'reference', width: 18 },
    { header: d.registration.fields.lastName, key: 'lastName', width: 18 },
    { header: d.registration.fields.firstName, key: 'firstName', width: 18 },
    { header: d.registration.fields.middleName, key: 'middleName', width: 18 },
    { header: d.registration.fields.birthDate, key: 'birthDate', width: 14 },
    { header: d.registration.fields.email, key: 'email', width: 28 },
    { header: d.registration.fields.phone, key: 'phone', width: 18 },
    { header: d.registration.fields.address, key: 'address', width: 32 },
    { header: d.registration.fields.institution, key: 'institution', width: 28 },
    { header: d.registration.fields.faculty, key: 'faculty', width: 22 },
    { header: d.registration.fields.position, key: 'position', width: 18 },
    { header: r.nomination, key: 'nomination', width: 22 },
    { header: d.registration.fields.round1, key: 'round1', width: 34 },
    { header: d.registration.fields.round2, key: 'round2', width: 34 },
    { header: d.registration.fields.round3, key: 'round3', width: 34 },
    { header: d.registration.fields.accompanistName, key: 'accompanist', width: 24 },
    { header: d.registration.fields.accompanistWorkplace, key: 'accompanistWork', width: 24 },
    { header: r.status, key: 'status', width: 16 },
    { header: r.submittedAt, key: 'submittedAt', width: 20 },
    { header: r.reviewedBy, key: 'reviewedBy', width: 20 },
    { header: r.reviewNote, key: 'reviewNote', width: 32 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: 'middle' };
  // Keeps the header visible while a reviewer scrolls a few hundred rows.
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const statusLabel: Record<RegistrationStatus, string> = {
    pending: r.pending,
    approved: r.approved,
    rejected: r.rejected,
  };

  for (const row of rows) {
    sheet.addRow({
      reference: row.referenceCode,
      lastName: row.lastName,
      firstName: row.firstName,
      middleName: row.middleName ?? '',
      birthDate: row.birthDate,
      email: row.email,
      phone: row.phone,
      address: row.address,
      institution: row.institution ?? '',
      faculty: row.faculty ?? '',
      position: row.positionTitle ?? '',
      nomination: row.nominationName ?? '',
      round1: row.programmeRound1 ?? '',
      round2: row.programmeRound2 ?? '',
      round3: row.programmeRound3 ?? '',
      accompanist: row.accompanistName ?? '',
      accompanistWork: row.accompanistWorkplace ?? '',
      status: statusLabel[row.status],
      submittedAt: new Date(row.createdAt).toISOString().slice(0, 16).replace('T', ' '),
      reviewedBy: row.reviewerName ?? '',
      reviewNote: row.reviewNote ?? '',
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="romansiada-registrations-${stamp}.xlsx"`,
      // This file contains applicants' contact details — never let a proxy keep a copy.
      'Cache-Control': 'no-store',
    },
  });
}

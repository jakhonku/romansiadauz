import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { RegistrationStatusBadge } from '@/components/common/status-badge';
import { RegistrationReview } from '@/components/layout/registration-review';
import { Button } from '@/components/ui/button';
import { getAdminDictionary, getAdminLocale } from '@/lib/auth/admin-locale';
import { requirePermission } from '@/lib/auth/session';
import { ageAt, formatDate, formatDateTime } from '@/lib/i18n/format';
import { getRegistration } from '@/server/queries/admin-registrations';
import type { RegistrationStatus } from '@/types/database.types';

export default async function AdminRegistrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission('registrations.review');

  const { id } = await params;
  const [d, locale] = await Promise.all([getAdminDictionary(), getAdminLocale()]);

  const row = await getRegistration(locale, id);
  if (!row) notFound();

  const r = d.admin.registrations;
  const f = d.registration.fields;

  const statusLabel: Record<RegistrationStatus, string> = {
    pending: r.pending,
    approved: r.approved,
    rejected: r.rejected,
  };

  const identity: [string, string | null][] = [
    [f.lastName, row.lastName],
    [f.firstName, row.firstName],
    [f.middleName, row.middleName],
    [f.birthDate, `${formatDate(row.birthDate, locale)} (${ageAt(row.birthDate)})`],
  ];

  const education: [string, string | null][] = [
    [f.institution, row.institution],
    [f.faculty, row.faculty],
    [f.position, row.positionTitle],
  ];

  const contact: [string, string | null][] = [
    [f.address, row.address],
    [f.email, row.email],
    [f.phone, row.phone],
  ];

  const programme: [string, string | null][] = [
    [r.nomination, row.nominationName],
    [f.round1, row.programmeRound1],
    [f.round2, row.programmeRound2],
    [f.round3, row.programmeRound3],
  ];

  const accompanist: [string, string | null][] = [
    [f.accompanistName, row.accompanistName],
    [f.accompanistWorkplace, row.accompanistWorkplace],
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="-ms-3">
        <Link href="/admin/registrations">
          <ArrowLeft className="rtl:rotate-180" />
          {r.back}
        </Link>
      </Button>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-muted-foreground">
            {row.referenceCode}
          </p>
          <h1 className="mt-2 font-display text-display-sm font-semibold">{row.fullName}</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            {r.submittedAt}: {formatDateTime(row.createdAt, locale)}
            {row.reviewerName ? ` · ${r.reviewedBy}: ${row.reviewerName}` : ''}
          </p>
        </div>
        <RegistrationStatusBadge status={row.status} label={statusLabel[row.status]} />
      </header>

      <div className="mt-8 flex flex-col gap-6">
        <DetailCard title={r.detailsTitle} rows={identity} />
        <DetailCard title={r.education} rows={education} />
        <DetailCard title={d.contact.title} rows={contact} />
        <DetailCard title={r.programme} rows={programme} />
        <DetailCard title={r.accompanist} rows={accompanist} />

        <RegistrationReview
          id={row.id}
          status={row.status}
          initialNote={row.reviewNote}
          labels={{
            decision: r.decision,
            approve: r.approve,
            reject: r.reject,
            reopen: r.reopen,
            note: r.reviewNote,
            notePlaceholder: r.reviewNotePlaceholder,
            saving: r.saving,
            error: d.admin.common.saveFailed,
            approvedNotice: r.approvedNotice,
            rejectedNotice: r.rejectedNotice,
            confirmReject: r.confirmReject,
          }}
        />
      </div>
    </div>
  );
}

/**
 * A titled block of label/value pairs.
 *
 * Empty values are dropped rather than rendered as a dash beside every optional field —
 * a reviewer scanning a page wants the answers that exist, not a checklist of the ones
 * that do not. A block whose values are all empty disappears entirely.
 */
function DetailCard({ title, rows }: { title: string; rows: [string, string | null][] }) {
  const filled = rows.filter(([, value]) => value && value.trim().length > 0);
  if (!filled.length) return null;

  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <dl className="mt-4 divide-y divide-border">
        {filled.map(([label, value]) => (
          <div
            key={label}
            className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)] sm:gap-4"
          >
            <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {label}
            </dt>
            <dd className="whitespace-pre-line text-sm">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

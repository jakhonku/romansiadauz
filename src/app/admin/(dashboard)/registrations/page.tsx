import { Download, FileText } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { FilterChips, type ChipOption } from '@/components/common/filter-chips';
import { Pagination } from '@/components/common/pagination';
import { RegistrationStatusBadge } from '@/components/common/status-badge';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { AdminSearch } from '@/components/layout/admin-search';
import { Button } from '@/components/ui/button';
import { Table, TableScroll, Tbody, Td, Th, Thead, Tr } from '@/components/ui/table';
import { getAdminDictionary, getAdminLocale } from '@/lib/auth/admin-locale';
import { requirePermission } from '@/lib/auth/session';
import { ageAt, formatDate } from '@/lib/i18n/format';
import { listRegistrations } from '@/server/queries/admin-registrations';
import type { RegistrationStatus } from '@/types/database.types';

const STATUSES: RegistrationStatus[] = ['pending', 'approved', 'rejected'];

function isStatus(value: string | undefined): value is RegistrationStatus {
  return value !== undefined && (STATUSES as string[]).includes(value);
}

export default async function AdminRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  await requirePermission('registrations.review');

  const query = await searchParams;
  const [d, locale] = await Promise.all([getAdminDictionary(), getAdminLocale()]);
  const r = d.admin.registrations;

  const status = isStatus(query.status) ? query.status : undefined;
  const search = query.q?.trim() || undefined;
  const page = Number.parseInt(query.page ?? '1', 10) || 1;

  const result = await listRegistrations(locale, { status, search, page });

  const base = '/admin/registrations';
  const buildHref = (next: { status?: string | null; page?: number }) => {
    const params = new URLSearchParams();
    const nextStatus = next.status === undefined ? status : next.status;
    if (nextStatus) params.set('status', nextStatus);
    if (search) params.set('q', search);
    const nextPage = next.page ?? 1;
    if (nextPage > 1) params.set('page', String(nextPage));
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const chips: ChipOption[] = [
    { value: null, label: r.allStatuses },
    { value: 'pending', label: r.pending },
    { value: 'approved', label: r.approved },
    { value: 'rejected', label: r.rejected },
  ];

  const statusLabel: Record<RegistrationStatus, string> = {
    pending: r.pending,
    approved: r.approved,
    rejected: r.rejected,
  };

  // The export must reflect what the reviewer is looking at, so the current filter
  // travels with it.
  const exportParams = new URLSearchParams();
  if (status) exportParams.set('status', status);
  if (search) exportParams.set('q', search);
  const exportHref = `/admin/registrations/export${
    exportParams.toString() ? `?${exportParams}` : ''
  }`;

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title={r.title}
        count={result.total}
        actions={
          result.total > 0 ? (
            <Button asChild variant="outline" size="sm">
              {/* A plain anchor, not <Link>: this is a file download, and the client
                  router would try to treat the response as a route. */}
              <a href={exportHref} download>
                <Download />
                {r.exportExcel}
              </a>
            </Button>
          ) : null
        }
      />

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips
          options={chips}
          active={status ?? null}
          buildHref={(value) => buildHref({ status: value, page: 1 })}
          label={r.status}
          className="justify-start"
        />
        <AdminSearch placeholder={r.searchPlaceholder} clearLabel={d.common.clearFilters} />
      </div>

      {result.items.length ? (
        <>
          <TableScroll className="mt-6" label={r.title}>
            <Table>
              <Thead>
                <tr>
                  <Th>{r.reference}</Th>
                  <Th>{d.registration.fields.lastName}</Th>
                  <Th>{r.age}</Th>
                  <Th>{r.nomination}</Th>
                  <Th>{d.registration.fields.phone}</Th>
                  <Th>{r.submittedAt}</Th>
                  <Th>{r.status}</Th>
                </tr>
              </Thead>
              <Tbody>
                {result.items.map((item) => (
                  <Tr key={item.id}>
                    <Td>
                      <Link
                        href={`/admin/registrations/${item.id}`}
                        className="font-mono text-xs font-semibold text-primary hover:underline"
                      >
                        {item.referenceCode}
                      </Link>
                    </Td>
                    <Td>
                      <Link href={`/admin/registrations/${item.id}`} className="hover:underline">
                        {item.fullName}
                      </Link>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {item.email}
                      </span>
                    </Td>
                    <Td className="tabular-nums">{ageAt(item.birthDate)}</Td>
                    <Td className="text-muted-foreground">{item.nominationName ?? '—'}</Td>
                    <Td className="whitespace-nowrap tabular-nums" dir="ltr">
                      {item.phone}
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(item.createdAt, locale)}
                    </Td>
                    <Td>
                      <RegistrationStatusBadge
                        status={item.status}
                        label={statusLabel[item.status]}
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableScroll>

          <Pagination
            className="mt-8"
            page={result.page}
            pageCount={result.pageCount}
            buildHref={(n) => buildHref({ page: n })}
            labels={{ previous: d.common.previous, next: d.common.next, page: d.common.page }}
          />
        </>
      ) : (
        <EmptyState className="mt-6" message={r.empty} icon={FileText} />
      )}
    </div>
  );
}

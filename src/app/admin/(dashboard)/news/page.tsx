import { Newspaper, Plus } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { FilterChips, type ChipOption } from '@/components/common/filter-chips';
import { Pagination } from '@/components/common/pagination';
import { ContentStatusBadge } from '@/components/common/status-badge';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableScroll, Tbody, Td, Th, Thead, Tr } from '@/components/ui/table';
import { getAdminDictionary, getAdminLocale } from '@/lib/auth/admin-locale';
import { requirePermission } from '@/lib/auth/session';
import { localeMetadata, locales } from '@/lib/i18n/config';
import { formatDate } from '@/lib/i18n/format';
import { cn } from '@/lib/utils/cn';
import { listAdminNews } from '@/server/queries/admin-news';
import type { ContentStatus } from '@/types/database.types';

const STATUSES: ContentStatus[] = ['draft', 'published', 'archived'];

function isStatus(value: string | undefined): value is ContentStatus {
  return value !== undefined && (STATUSES as string[]).includes(value);
}

export default async function AdminNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requirePermission('content.manage');

  const query = await searchParams;
  const [d, locale] = await Promise.all([getAdminDictionary(), getAdminLocale()]);
  const n = d.admin.news;
  const c = d.admin.common;

  const status = isStatus(query.status) ? query.status : undefined;
  const page = Number.parseInt(query.page ?? '1', 10) || 1;

  const result = await listAdminNews(locale, { status, page });

  const base = '/admin/news';
  const buildHref = (next: { status?: string | null; page?: number }) => {
    const params = new URLSearchParams();
    const nextStatus = next.status === undefined ? status : next.status;
    if (nextStatus) params.set('status', nextStatus);
    const nextPage = next.page ?? 1;
    if (nextPage > 1) params.set('page', String(nextPage));
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const chips: ChipOption[] = [
    { value: null, label: n.allStatuses },
    { value: 'published', label: c.published },
    { value: 'draft', label: c.draft },
    { value: 'archived', label: c.archived },
  ];

  const statusLabel: Record<ContentStatus, string> = {
    draft: c.draft,
    published: c.published,
    archived: c.archived,
  };

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title={n.title}
        count={result.total}
        actions={
          <Button asChild size="sm">
            <Link href="/admin/news/new">
              <Plus />
              {n.newArticle}
            </Link>
          </Button>
        }
      />

      <FilterChips
        className="mt-7 justify-start"
        options={chips}
        active={status ?? null}
        buildHref={(value) => buildHref({ status: value, page: 1 })}
        label={c.status}
      />

      {result.items.length ? (
        <>
          <TableScroll className="mt-6" label={n.title}>
            <Table>
              <Thead>
                <tr>
                  <Th>{c.title}</Th>
                  <Th>{c.translations}</Th>
                  <Th>{c.status}</Th>
                  <Th>{n.publishedAt}</Th>
                  <Th>{c.updatedAt}</Th>
                </tr>
              </Thead>
              <Tbody>
                {result.items.map((item) => (
                  <Tr key={item.id}>
                    <Td>
                      <Link
                        href={`/admin/news/${item.id}`}
                        className="font-medium hover:underline"
                      >
                        {item.title}
                      </Link>
                      <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                        /{item.slug}
                      </span>
                    </Td>
                    <Td>
                      {/* Translation coverage at a glance — the reason an editor opens
                          this list is usually "what still needs translating?". */}
                      <span className="flex gap-1">
                        {locales.map((code) => (
                          <span
                            key={code}
                            title={localeMetadata[code].nativeName}
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[0.625rem] font-semibold',
                              item.translatedLocales.includes(code)
                                ? 'bg-success/10 text-success'
                                : 'bg-muted text-muted-foreground/50',
                            )}
                          >
                            {localeMetadata[code].label}
                          </span>
                        ))}
                      </span>
                    </Td>
                    <Td>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <ContentStatusBadge status={item.status} label={statusLabel[item.status]} />
                        {item.isFeatured ? <Badge variant="gold">{c.featured}</Badge> : null}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-muted-foreground">
                      {item.publishedAt ? formatDate(item.publishedAt, locale) : '—'}
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(item.updatedAt, locale)}
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
            buildHref={(p) => buildHref({ page: p })}
            labels={{ previous: d.common.previous, next: d.common.next, page: d.common.page }}
          />
        </>
      ) : (
        <EmptyState className="mt-6" message={n.empty} icon={Newspaper}>
          <Button asChild size="sm" className="mt-2">
            <Link href="/admin/news/new">
              <Plus />
              {n.newArticle}
            </Link>
          </Button>
        </EmptyState>
      )}
    </div>
  );
}

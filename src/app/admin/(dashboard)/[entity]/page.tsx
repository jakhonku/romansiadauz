import { Plus } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { EmptyState } from '@/components/common/empty-state';
import { ContentStatusBadge } from '@/components/common/status-badge';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { Table, TableScroll, Tbody, Td, Th, Thead, Tr } from '@/components/ui/table';
import { getEntity } from '@/lib/admin/entities';
import { getAdminDictionary, getAdminLocale } from '@/lib/auth/admin-locale';
import { requirePermission } from '@/lib/auth/session';
import { localeMetadata, locales } from '@/lib/i18n/config';
import { cn } from '@/lib/utils/cn';
import { listEntity } from '@/server/queries/admin-entity';
import type { ContentStatus } from '@/types/database.types';

/**
 * List view for every descriptor-driven module.
 *
 * A dynamic `[entity]` segment rather than seven near-identical folders. The registry
 * is the whitelist — an unknown key 404s, so this does not become an accidental
 * open route. Modules with their own folder (`news`, `messages`, `registrations`) win
 * over this one: Next resolves a static segment before a dynamic sibling.
 */
export default async function AdminEntityListPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity } = await params;
  const config = getEntity(entity);
  if (!config) notFound();

  await requirePermission('content.manage');

  const [d, locale] = await Promise.all([getAdminDictionary(), getAdminLocale()]);
  const c = d.admin.common;

  const items = await listEntity(config, locale);

  const statusLabel: Record<ContentStatus, string> = {
    draft: c.draft,
    published: c.published,
    archived: c.archived,
  };

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title={config.title(d)}
        count={items.length}
        actions={
          <Button asChild size="sm">
            <Link href={`/admin/${config.key}/new`}>
              <Plus />
              {config.newLabel(d)}
            </Link>
          </Button>
        }
      />

      {items.length ? (
        <TableScroll className="mt-7" label={config.title(d)}>
          <Table>
            <Thead>
              <tr>
                <Th>{c.title}</Th>
                {config.listColumns?.map((column) => (
                  <Th key={column.column}>{column.label(d)}</Th>
                ))}
                <Th>{c.translations}</Th>
                {config.hasStatus ? <Th>{c.status}</Th> : null}
                {config.hasSortOrder ? <Th>{c.sortOrder}</Th> : null}
              </tr>
            </Thead>
            <Tbody>
              {items.map((item) => (
                <Tr key={item.id}>
                  <Td>
                    <Link
                      href={`/admin/${config.key}/${item.id}`}
                      className="font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
                    {item.slug ? (
                      <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                        /{item.slug}
                      </span>
                    ) : null}
                  </Td>

                  {config.listColumns?.map((column) => (
                    <Td key={column.column} className="whitespace-nowrap text-sm text-muted-foreground">
                      {item.extras[column.column] || '—'}
                    </Td>
                  ))}

                  <Td>
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

                  {config.hasStatus && item.status ? (
                    <Td>
                      <ContentStatusBadge status={item.status} label={statusLabel[item.status]} />
                    </Td>
                  ) : config.hasStatus ? (
                    <Td>—</Td>
                  ) : null}

                  {config.hasSortOrder ? (
                    <Td className="tabular-nums text-muted-foreground">{item.sortOrder ?? 0}</Td>
                  ) : null}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableScroll>
      ) : (
        <EmptyState className="mt-7" message={config.emptyLabel(d)}>
          <Button asChild size="sm" className="mt-2">
            <Link href={`/admin/${config.key}/new`}>
              <Plus />
              {config.newLabel(d)}
            </Link>
          </Button>
        </EmptyState>
      )}
    </div>
  );
}

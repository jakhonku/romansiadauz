import { Inbox } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { FilterChips, type ChipOption } from '@/components/common/filter-chips';
import { Pagination } from '@/components/common/pagination';
import { AdminPageHeader } from '@/components/layout/admin-page-header';
import { MessageCard } from '@/components/layout/message-card';
import { getAdminDictionary, getAdminLocale } from '@/lib/auth/admin-locale';
import { requirePermission } from '@/lib/auth/session';
import { formatDateTime } from '@/lib/i18n/format';
import { listMessages } from '@/server/queries/admin-messages';

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  await requirePermission('messages.review');

  const query = await searchParams;
  const [d, locale] = await Promise.all([getAdminDictionary(), getAdminLocale()]);
  const m = d.admin.messages;

  const view = query.view === 'archived' || query.view === 'unread' ? query.view : null;
  const page = Number.parseInt(query.page ?? '1', 10) || 1;

  const result = await listMessages({
    archived: view === 'archived',
    unreadOnly: view === 'unread',
    page,
  });

  const base = '/admin/messages';
  const buildHref = (next: { view?: string | null; page?: number }) => {
    const params = new URLSearchParams();
    const nextView = next.view === undefined ? view : next.view;
    if (nextView) params.set('view', nextView);
    const nextPage = next.page ?? 1;
    if (nextPage > 1) params.set('page', String(nextPage));
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const chips: ChipOption[] = [
    { value: null, label: m.inbox },
    { value: 'unread', label: `${m.unreadOnly}${result.unread ? ` (${result.unread})` : ''}` },
    { value: 'archived', label: m.archived },
  ];

  const labels = {
    markRead: m.markRead,
    markUnread: m.markUnread,
    archive: m.archive,
    unarchive: m.unarchive,
    reply: m.reply,
    noSubject: m.noSubject,
    receivedAt: m.receivedAt,
  };

  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader title={m.title} count={result.total} />

      <FilterChips
        className="mt-7 justify-start"
        options={chips}
        active={view}
        buildHref={(value) => buildHref({ view: value, page: 1 })}
        label={m.title}
      />

      {result.items.length ? (
        <>
          <div className="mt-6 flex flex-col gap-4">
            {result.items.map((item) => (
              <MessageCard
                key={item.id}
                id={item.id}
                name={item.name}
                email={item.email}
                phone={item.phone}
                subject={item.subject}
                message={item.message}
                isRead={item.isRead}
                isArchived={item.isArchived}
                // Formatted here, on the server: `Intl` output differs between Node and
                // the browser for our locales and would break hydration.
                receivedAt={formatDateTime(item.createdAt, locale)}
                labels={labels}
              />
            ))}
          </div>

          <Pagination
            className="mt-8"
            page={result.page}
            pageCount={result.pageCount}
            buildHref={(n) => buildHref({ page: n })}
            labels={{ previous: d.common.previous, next: d.common.next, page: d.common.page }}
          />
        </>
      ) : (
        <EmptyState className="mt-6" message={m.empty} icon={Inbox} />
      )}
    </div>
  );
}

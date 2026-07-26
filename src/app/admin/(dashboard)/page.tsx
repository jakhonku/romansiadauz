import { CheckCircle2, Clock, FileText, Inbox, Newspaper, XCircle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getAdminDictionary } from '@/lib/auth/admin-locale';
import { can } from '@/lib/auth/rbac';
import { requirePermission } from '@/lib/auth/session';
import { interpolate } from '@/lib/i18n/format';
import { cn } from '@/lib/utils/cn';
import { getDashboardStats } from '@/server/queries/dashboard';

export default async function AdminDashboardPage() {
  // Every role holds `dashboard.view`, so this is a session check in practice — but
  // going through the same guard as every other page means there is one pattern to
  // audit rather than two.
  const session = await requirePermission('dashboard.view');
  const [d, stats] = await Promise.all([getAdminDictionary(), getDashboardStats()]);

  const dash = d.admin.dashboard;
  const showRegistrations = can(session.role, 'registrations.review');
  const showMessages = can(session.role, 'messages.review');
  const showContent = can(session.role, 'content.manage');

  const cards = [
    {
      show: showRegistrations,
      icon: FileText,
      label: dash.totalRegistrations,
      value: stats.registrationsTotal,
      href: '/admin/registrations',
      tone: 'default' as const,
    },
    {
      show: showRegistrations,
      icon: Clock,
      label: dash.pendingRegistrations,
      value: stats.registrationsPending,
      href: '/admin/registrations?status=pending',
      tone: 'warning' as const,
    },
    {
      show: showRegistrations,
      icon: CheckCircle2,
      label: dash.approvedRegistrations,
      value: stats.registrationsApproved,
      href: '/admin/registrations?status=approved',
      tone: 'success' as const,
    },
    {
      show: showRegistrations,
      icon: XCircle,
      label: dash.rejectedRegistrations,
      value: stats.registrationsRejected,
      href: '/admin/registrations?status=rejected',
      tone: 'destructive' as const,
    },
    {
      show: showContent,
      icon: Newspaper,
      label: dash.publishedNews,
      value: stats.newsPublished,
      href: '/admin/news',
      tone: 'default' as const,
    },
    {
      show: showMessages,
      icon: Inbox,
      label: dash.unreadMessages,
      value: stats.messagesUnread,
      href: '/admin/messages',
      tone: 'default' as const,
    },
  ].filter((card) => card.show);

  return (
    <div className="mx-auto max-w-6xl">
      <header>
        <h1 className="font-display text-display-sm font-semibold">
          {interpolate(dash.welcome, { name: session.fullName })}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{dash.subtitle}</p>
      </header>

      {cards.length ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="group rounded-card border border-border bg-card p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {card.label}
                </p>
                <card.icon
                  aria-hidden
                  className={cn(
                    'size-5 shrink-0',
                    card.tone === 'success' && 'text-success',
                    card.tone === 'warning' && 'text-warning',
                    card.tone === 'destructive' && 'text-destructive',
                    card.tone === 'default' && 'text-gold',
                  )}
                />
              </div>
              <p className="mt-5 font-display text-display-sm font-bold leading-none tabular-nums">
                {card.value}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-8 rounded-card border border-dashed border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground">
          {dash.noData}
        </p>
      )}

      {showRegistrations ? (
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/admin/registrations">{d.admin.nav.registrations}</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import {
  CalendarDays,
  FileText,
  Film,
  Gauge,
  Handshake,
  Images,
  Inbox,
  Menu,
  Newspaper,
  Settings,
  Trophy,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Wordmark } from '@/components/common/wordmark';
import { Button } from '@/components/ui/button';
import type { AdminIconName, ResolvedAdminNavGroup } from '@/lib/auth/admin-nav';
import { cn } from '@/lib/utils/cn';

const ICONS: Record<AdminIconName, typeof Gauge> = {
  dashboard: Gauge,
  registrations: FileText,
  messages: Inbox,
  news: Newspaper,
  gallery: Images,
  videos: Film,
  judges: Users,
  winners: Trophy,
  partners: Handshake,
  events: CalendarDays,
  users: UserRound,
  settings: Settings,
};

interface Brand {
  name: string;
  region: string;
}

/**
 * The link list, shared by the desktop rail and the mobile drawer.
 *
 * Extracted so a new admin section is added in exactly one place. The two wrappers
 * differ only in chrome.
 */
function AdminNavList({ groups, menuLabel }: { groups: ResolvedAdminNavGroup[]; menuLabel: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label={menuLabel} className="flex flex-col gap-7">
      {groups.map((group, index) => (
        <div key={group.title ?? `group-${index}`}>
          {group.title ? (
            <p className="px-3 text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {group.title}
            </p>
          ) : null}

          <ul className={cn('flex flex-col gap-0.5', group.title && 'mt-3')}>
            {group.items.map((item) => {
              const Icon = ICONS[item.icon];
              // `/admin` must not light up for every child route, so the dashboard
              // matches exactly while sections match their subtree.
              const active =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Fixed rail, `lg` and up. Stateless — at this width the nav is simply always there. */
export function AdminSidebar({
  groups,
  brand,
  menuLabel,
}: {
  groups: ResolvedAdminNavGroup[];
  brand: Brand;
  menuLabel: string;
}) {
  return (
    <aside className="hidden w-64 shrink-0 border-e border-border bg-card lg:block">
      <div className="sticky top-0 flex h-dvh flex-col">
        <div className="border-b border-border px-5 py-5">
          <Link href="/admin">
            <Wordmark name={brand.name} region={brand.region} size="sm" />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-6">
          <AdminNavList groups={groups} menuLabel={menuLabel} />
        </div>
      </div>
    </aside>
  );
}

/**
 * Trigger + slide-over for narrow screens. Lives in the topbar, so the button sits
 * where a hamburger is expected rather than floating beside the content column.
 */
export function AdminMobileNav({
  groups,
  brand,
  menuLabel,
  closeLabel,
}: {
  groups: ResolvedAdminNavGroup[];
  brand: Brand;
  menuLabel: string;
  closeLabel: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Next keeps the layout mounted across navigations, so nothing else would close it.
  useEffect(() => setOpen(false), [pathname]);

  // Escape must dismiss an overlay; this one is hand-rolled rather than a Radix dialog
  // because it is navigation, not a modal — content behind it stays readable.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        aria-label={menuLabel}
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 start-0 flex w-72 flex-col bg-card shadow-lift">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <Wordmark name={brand.name} region={brand.region} size="sm" />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpen(false)}
                aria-label={closeLabel}
              >
                <X className="size-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-6">
              <AdminNavList groups={groups} menuLabel={menuLabel} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

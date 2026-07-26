import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Permission } from '@/lib/auth/rbac';

/**
 * Admin sidebar, declared once with the permission each entry needs.
 *
 * The sidebar is filtered by permission before render, so an editor never sees a
 * "Users" link they cannot open. That is a courtesy, not a control — the route itself
 * calls `requirePermission`, and RLS refuses the rows regardless.
 */
export interface AdminNavItem {
  href: string;
  label: (d: Dictionary) => string;
  permission: Permission;
  /** lucide icon name, resolved in the sidebar component. */
  icon: AdminIconName;
}

export type AdminIconName =
  | 'dashboard'
  | 'registrations'
  | 'messages'
  | 'news'
  | 'gallery'
  | 'videos'
  | 'judges'
  | 'winners'
  | 'partners'
  | 'events'
  | 'pages'
  | 'users'
  | 'settings';

export interface AdminNavGroup {
  /** `null` for the ungrouped first block. */
  title: ((d: Dictionary) => string) | null;
  items: AdminNavItem[];
}

export const adminNav: readonly AdminNavGroup[] = [
  {
    title: null,
    items: [
      {
        href: '/admin',
        label: (d) => d.admin.nav.dashboard,
        permission: 'dashboard.view',
        icon: 'dashboard',
      },
    ],
  },
  {
    title: (d) => d.admin.nav.registrations,
    items: [
      {
        href: '/admin/registrations',
        label: (d) => d.admin.nav.registrations,
        permission: 'registrations.review',
        icon: 'registrations',
      },
      {
        href: '/admin/messages',
        label: (d) => d.admin.nav.messages,
        permission: 'messages.review',
        icon: 'messages',
      },
    ],
  },
  {
    title: (d) => d.admin.common.title,
    items: [
      { href: '/admin/news', label: (d) => d.admin.nav.news, permission: 'content.manage', icon: 'news' },
      { href: '/admin/gallery', label: (d) => d.admin.nav.gallery, permission: 'content.manage', icon: 'gallery' },
      { href: '/admin/videos', label: (d) => d.admin.nav.videos, permission: 'content.manage', icon: 'videos' },
      { href: '/admin/judges', label: (d) => d.admin.nav.judges, permission: 'content.manage', icon: 'judges' },
      { href: '/admin/winners', label: (d) => d.admin.nav.winners, permission: 'content.manage', icon: 'winners' },
      { href: '/admin/partners', label: (d) => d.admin.nav.partners, permission: 'content.manage', icon: 'partners' },
      { href: '/admin/events', label: (d) => d.admin.nav.events, permission: 'content.manage', icon: 'events' },
      { href: '/admin/pages', label: (d) => d.admin.nav.pages, permission: 'content.manage', icon: 'pages' },
    ],
  },
  {
    title: (d) => d.admin.settings.title,
    items: [
      { href: '/admin/users', label: (d) => d.admin.nav.users, permission: 'users.manage', icon: 'users' },
      { href: '/admin/settings', label: (d) => d.admin.nav.settings, permission: 'settings.manage', icon: 'settings' },
    ],
  },
] as const;

/** Plain, serialisable sidebar data for the client component. */
export interface ResolvedAdminNavGroup {
  title: string | null;
  items: { href: string; label: string; icon: AdminIconName }[];
}

export function resolveAdminNav(
  d: Dictionary,
  hasPermission: (permission: Permission) => boolean,
): ResolvedAdminNavGroup[] {
  return adminNav
    .map((group) => ({
      title: group.title ? group.title(d) : null,
      items: group.items
        .filter((item) => hasPermission(item.permission))
        .map((item) => ({ href: item.href, label: item.label(d), icon: item.icon })),
    }))
    // A group whose every entry was filtered out would otherwise render as a bare
    // heading with nothing under it.
    .filter((group) => group.items.length > 0);
}

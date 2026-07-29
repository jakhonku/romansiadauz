import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { AdminTopbar } from '@/components/layout/admin-topbar';
import { getAdminDictionary, getAdminLocale } from '@/lib/auth/admin-locale';
import { resolveAdminNav } from '@/lib/auth/admin-nav';
import { can } from '@/lib/auth/rbac';
import { requireStaffSession } from '@/lib/auth/session';
import { localizeHref } from '@/lib/i18n/config';
import type { AppRole } from '@/types/database.types';

/**
 * Auth-gated shell for every admin screen.
 *
 * This is the second of the three enforcement points from ARCHITECTURE §6. Middleware
 * answers "are you signed in?" without a database round-trip; this layout answers "are
 * you still active staff?" *before any UI renders*, and RLS answers "may you see this
 * row?" at the data. A route group is used so the login screen — which must be
 * reachable without a session — sits outside it.
 */

/**
 * `force-dynamic` because the panel must never be prerendered or served from a shared
 * cache. Reading cookies already forces this; stating it makes the intent explicit
 * rather than incidental to an implementation detail.
 */
export const dynamic = 'force-dynamic';

const roleLabelKey: Record<AppRole, 'roleAdmin' | 'roleEditor' | 'roleModerator' | 'roleViewer'> = {
  admin: 'roleAdmin',
  editor: 'roleEditor',
  moderator: 'roleModerator',
  viewer: 'roleViewer',
};

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStaffSession();
  const [d, locale] = await Promise.all([getAdminDictionary(), getAdminLocale()]);

  const groups = resolveAdminNav(d, (permission) => can(session.role, permission));

  return (
    <div className="flex min-h-dvh">
      <AdminSidebar
        groups={groups}
        brand={{ name: d.meta.shortName, region: d.meta.region }}
        menuLabel={d.nav.menu}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-card/90 px-5 py-3 backdrop-blur-xl">
          <AdminTopbar
            fullName={session.fullName}
            roleLabel={d.admin.users[roleLabelKey[session.role]]}
            siteHref={localizeHref('/', locale)}
            navGroups={groups}
            brand={{ name: d.meta.shortName, region: d.meta.region }}
            locale={locale}
            labels={{
              logout: d.admin.nav.logout,
              viewSite: d.admin.nav.viewSite,
              menu: d.nav.menu,
              closeMenu: d.nav.closeMenu,
              language: d.nav.language,
              theme: {
                theme: d.nav.theme,
                light: d.nav.themeLight,
                dark: d.nav.themeDark,
                system: d.nav.themeSystem,
              },
            }}
          />
        </header>

        <main className="flex-1 px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

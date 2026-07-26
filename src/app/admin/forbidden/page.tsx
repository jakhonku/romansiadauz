import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getAdminDictionary } from '@/lib/auth/admin-locale';
import { requireStaffSession } from '@/lib/auth/session';

/**
 * 403 for signed-in staff who lack a permission.
 *
 * Sits outside the `(dashboard)` group so it cannot render the sidebar — showing
 * someone the full navigation while telling them they may not use it is a poor
 * apology. It still requires a session: an anonymous visitor gets the login redirect,
 * because "forbidden" is not information owed to a stranger.
 */
export default async function AdminForbiddenPage() {
  await requireStaffSession();
  const d = await getAdminDictionary();

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-12">
      <div className="flex max-w-md flex-col items-center text-center">
        <ShieldAlert className="size-12 text-warning" aria-hidden />
        <h1 className="mt-6 font-display text-display-sm font-semibold">
          {d.admin.forbidden.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {d.admin.forbidden.body}
        </p>

        <Button asChild className="mt-8">
          <Link href="/admin">{d.admin.nav.dashboard}</Link>
        </Button>
      </div>
    </main>
  );
}

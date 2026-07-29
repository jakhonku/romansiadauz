'use client';

import { ExternalLink, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useTransition } from 'react';

import { ThemeToggle, type ThemeToggleLabels } from '@/components/common/theme-toggle';
import { AdminLocaleSwitcher } from '@/components/layout/admin-locale-switcher';
import { AdminMobileNav } from '@/components/layout/admin-sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ResolvedAdminNavGroup } from '@/lib/auth/admin-nav';
import type { AdminLocale } from '@/lib/i18n/config';
import { signOut } from '@/server/actions/auth';

export interface AdminTopbarLabels {
  logout: string;
  viewSite: string;
  menu: string;
  closeMenu: string;
  language: string;
  theme: ThemeToggleLabels;
}

/**
 * Admin header: identity on the left, session controls on the right.
 *
 * Sign-out is a form posting to a Server Action rather than a link. A GET link would
 * let any page on the internet sign an operator out with an `<img src>`, and browsers
 * pre-fetch links — a sign-out that a prefetcher can trigger is a bug waiting to be
 * reported as "the panel keeps logging me out".
 */
export function AdminTopbar({
  fullName,
  roleLabel,
  siteHref,
  navGroups,
  brand,
  locale,
  labels,
}: {
  fullName: string;
  roleLabel: string;
  /** Locale-prefixed public homepage. */
  siteHref: string;
  navGroups: ResolvedAdminNavGroup[];
  brand: { name: string; region: string };
  /** Language the panel's chrome is currently drawn in. */
  locale: AdminLocale;
  labels: AdminTopbarLabels;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-4">
      <AdminMobileNav
        groups={navGroups}
        brand={brand}
        menuLabel={labels.menu}
        closeLabel={labels.closeMenu}
      />

      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{fullName}</p>
        <Badge variant="muted" className="mt-1">
          {roleLabel}
        </Badge>
      </div>

      <div className="ms-auto flex items-center gap-1">
        <Button asChild variant="ghost" size="icon-sm" aria-label={labels.viewSite}>
          <Link href={siteHref} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-[1.1rem]" />
          </Link>
        </Button>

        <AdminLocaleSwitcher current={locale} label={labels.language} />

        <ThemeToggle labels={labels.theme} />

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={labels.logout}
          disabled={pending}
          onClick={() => startTransition(() => void signOut())}
        >
          <LogOut className="size-[1.1rem]" />
        </Button>
      </div>
    </div>
  );
}

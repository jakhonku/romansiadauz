import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { AdminLoginForm } from '@/components/layout/admin-login-form';
import { Wordmark } from '@/components/common/wordmark';
import { getAdminDictionary, getAdminLocale } from '@/lib/auth/admin-locale';
import { localizeHref } from '@/lib/i18n/config';

/**
 * Sign-in screen.
 *
 * Outside the `(dashboard)` route group, so it is the one admin route with no session
 * requirement. Middleware bounces an already-authenticated visitor away from here to
 * `/admin`, which keeps the "signed in but staring at a login form" state impossible.
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, d, locale] = await Promise.all([
    searchParams,
    getAdminDictionary(),
    getAdminLocale(),
  ]);

  return (
    <main className="grid min-h-dvh place-items-center bg-surface px-5 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <Wordmark name={d.meta.shortName} region={d.meta.region} size="lg" />
        </div>

        <div className="mt-10 rounded-card border border-border bg-card p-7 shadow-lift sm:p-9">
          <h1 className="font-display text-display-sm font-semibold">{d.admin.login.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{d.admin.login.subtitle}</p>

          <div className="mt-8">
            <AdminLoginForm
              next={next}
              labels={{
                email: d.admin.login.email,
                password: d.admin.login.password,
                submit: d.admin.login.submit,
                submitting: d.admin.login.submitting,
                error: d.admin.login.error,
                inactive: d.admin.login.inactive,
                rateLimited: d.admin.login.rateLimited,
              }}
            />
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href={localizeHref('/', locale)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" />
            {d.admin.login.backToSite}
          </Link>
        </div>
      </div>
    </main>
  );
}

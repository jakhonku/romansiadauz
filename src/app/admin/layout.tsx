import type { Metadata } from 'next';

import { ThemeProvider } from '@/components/common/theme-provider';
import { fontVariables } from '@/lib/fonts';
import { getAdminLocale } from '@/lib/auth/admin-locale';
import { localeMetadata } from '@/lib/i18n/config';

/**
 * Document shell for the admin panel.
 *
 * Renders its own `<html>`/`<body>` because the root layout is a pass-through — see
 * ARCHITECTURE §3. This is a separate document from the public site on purpose: the
 * panel is single-language per session, denser, and must never be indexed or cached by
 * a shared proxy (the `no-store` and `noindex` headers are set for `/admin/:path*` in
 * `next.config.ts`).
 */
export const metadata: Metadata = {
  title: { default: 'Romansiada — Admin', template: '%s · Admin' },
  robots: { index: false, follow: false },
};

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getAdminLocale();

  return (
    <html lang={localeMetadata[locale].htmlLang} suppressHydrationWarning>
      <body className={`${fontVariables} min-h-dvh bg-muted/40 font-sans antialiased`}>
        {/*
          `storageKey` is separate from the public site's. An operator who prefers a
          dark panel at night should not have that flip the public site they are
          previewing in the next tab.
        */}
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          storageKey="romansiada-admin-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

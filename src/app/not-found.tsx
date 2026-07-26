import Link from 'next/link';

import { BrandMark } from '@/components/common/brand-mark';
import { fontVariables } from '@/lib/fonts';
import { defaultLocale } from '@/lib/i18n/config';

/**
 * Root 404 — reached when the URL matched no segment at all, most often because the
 * locale prefix was invalid (`/de/news`) and `[locale]/layout.tsx` itself called
 * `notFound()`. When a layout throws, Next cannot use the `not-found.tsx` nested inside
 * it, so this boundary sits above and renders its own `<html>`/`<body>`: the root layout
 * is a pass-through and supplies neither.
 *
 * It is monolingual by necessity — there is no valid locale to translate into.
 */
export default function RootNotFound() {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontVariables} bg-background font-sans text-foreground antialiased`}>
        <main className="grid min-h-dvh place-items-center px-6">
          <div className="flex max-w-md flex-col items-center text-center">
            <BrandMark className="h-14 w-14 opacity-70" gradientId="root-not-found-mark" />

            <p className="mt-8 font-display text-display-2xl font-bold leading-none text-gold-ink">
              404
            </p>
            <h1 className="mt-4 font-display text-display-sm font-semibold">Page not found</h1>
            <p className="mt-4 text-muted-foreground">
              This address does not exist. Check the language prefix in the URL — the site is
              served at <code className="text-foreground">/uz</code>,{' '}
              <code className="text-foreground">/ru</code> and{' '}
              <code className="text-foreground">/en</code>.
            </p>

            <Link
              href={`/${defaultLocale}`}
              className="mt-9 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Go to homepage
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}

'use client';

import { fontVariables } from '@/lib/fonts';

/**
 * Last-resort boundary: it catches failures in the locale/admin layouts themselves, at
 * which point no other layout is mounted. It must therefore render its own document,
 * and it must not import anything that could be implicated in the original failure —
 * hence no dictionary, no theme provider, no icon set.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className={`${fontVariables} bg-background font-sans text-foreground antialiased`}>
        <main className="grid min-h-dvh place-items-center px-6">
          <div className="flex max-w-md flex-col items-center text-center">
            <h1 className="font-display text-display-md font-semibold">Something went wrong</h1>
            <p className="mt-4 text-muted-foreground">
              The page could not be rendered. Please reload, or try again shortly.
            </p>
            {error.digest ? (
              <p className="mt-4 font-mono text-xs text-muted-foreground/70">#{error.digest}</p>
            ) : null}
            <button
              type="button"
              onClick={reset}
              className="mt-8 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}

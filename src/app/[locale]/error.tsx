'use client';

import { RotateCcw } from 'lucide-react';
import { useEffect } from 'react';

import { BrandMark } from '@/components/common/brand-mark';
import { Button } from '@/components/ui/button';

/**
 * Locale-segment error boundary.
 *
 * Copy is hardcoded trilingually rather than read from a dictionary: this component
 * renders precisely when something upstream has failed, and an async dictionary load is
 * one more thing that could fail with it. Three short lines of static text is a cheap
 * price for a boundary that cannot itself throw.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only handle on the server-side stack, which Next strips from
    // the client payload in production.
    console.error('[romansiada] unhandled error', error.digest ?? error.message);
  }, [error]);

  return (
    <section className="grid min-h-[70vh] place-items-center px-6 pt-header">
      <div className="flex max-w-md flex-col items-center text-center">
        <BrandMark className="h-14 w-14 opacity-70" gradientId="error-mark" />

        <h1 className="mt-8 text-display-sm font-semibold">Xatolik yuz berdi</h1>
        <p className="mt-3 text-muted-foreground">
          Что-то пошло не так. Попробуйте ещё раз.
          <br />
          Something went wrong. Please try again.
        </p>

        {error.digest ? (
          <p className="mt-4 font-mono text-xs text-muted-foreground/70">#{error.digest}</p>
        ) : null}

        <Button onClick={reset} pill className="mt-8">
          <RotateCcw />
          Qayta urinish
        </Button>
      </div>
    </section>
  );
}

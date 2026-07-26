'use client';

import { Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { Input } from '@/components/ui/field';
import { cn } from '@/lib/utils/cn';

/**
 * Debounced search box that writes to the URL.
 *
 * The query lives in `?q=` rather than in component state so a reviewer can bookmark or
 * share "pending applications matching Karimova", and so the back button steps through
 * searches the way people expect.
 *
 * Debounced at 350ms: without it every keystroke is a server round-trip and a database
 * query. `replace`, not `push`, so typing eight characters does not leave eight entries
 * in the history stack.
 */
export function AdminSearch({
  placeholder,
  clearLabel,
  className,
}: {
  placeholder: string;
  clearLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const current = searchParams.get('q') ?? '';
  const [value, setValue] = useState(current);

  // Keep in step when the URL changes from elsewhere — a filter chip reset, or the back
  // button — without clobbering what the reviewer is mid-way through typing.
  useEffect(() => {
    setValue((previous) => (previous === current ? previous : current));
  }, [current]);

  useEffect(() => {
    if (value === current) return;

    const id = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set('q', value);
      else params.delete('q');
      // A new search always restarts at page one; page 5 of the old query is meaningless.
      params.delete('page');

      const qs = params.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    }, 350);

    return () => clearTimeout(id);
  }, [value, current, pathname, router, searchParams]);

  return (
    <div className={cn('relative w-full sm:max-w-xs', className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-busy={pending}
        className="ps-9 pe-9"
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue('')}
          aria-label={clearLabel}
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

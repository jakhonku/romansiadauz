'use client';

import { Globe } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { localeMetadata, locales, localizeHref, type Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils/cn';

/**
 * Language switcher.
 *
 * Each option is a real `<Link>` to the same page under a different locale prefix, not
 * a router push from an `onValueChange`. That matters for three reasons: the target is
 * visible in the status bar, it survives middle-click and "open in new tab", and
 * crawlers can follow it. Persisting the choice is left to `middleware.ts`, which
 * already writes `NEXT_LOCALE` whenever it sees a locale-prefixed path — so there is no
 * second source of truth here.
 */
export function LocaleSwitcher({
  currentLocale,
  label,
  className,
}: {
  currentLocale: Locale;
  label: string;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Preserve pagination, filters and search when switching language.
  const query = searchParams.toString();
  const suffix = query ? `?${query}` : '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={label} className={cn('gap-1.5 px-2.5', className)}>
          <Globe className="size-[1.05rem]" />
          <span className="text-xs font-semibold tracking-widest">
            {localeMetadata[currentLocale].label}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]">
        <DropdownMenuRadioGroup value={currentLocale}>
          {locales.map((locale) => (
            <DropdownMenuRadioItem key={locale} value={locale} asChild>
              <Link href={`${localizeHref(pathname, locale)}${suffix}`} hrefLang={locale}>
                <span className="w-6 text-xs font-semibold tracking-widest text-muted-foreground">
                  {localeMetadata[locale].label}
                </span>
                {localeMetadata[locale].nativeName}
              </Link>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

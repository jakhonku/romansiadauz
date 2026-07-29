'use client';

import { Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { adminLocales, localeMetadata, type AdminLocale } from '@/lib/i18n/config';
import { setAdminLocale } from '@/server/actions/admin-locale';
import { cn } from '@/lib/utils/cn';

/**
 * Panel language: Uzbek or Russian.
 *
 * Unlike the public switcher this cannot be a set of `<Link>`s, because the panel's
 * routes carry no locale segment — there is no other URL to point at. So the choice is
 * written to a cookie by a Server Action and the tree is re-rendered; `router.refresh()`
 * is what re-fetches the layout, sidebar and page in the new language without a full
 * document load, which keeps scroll position and any open form intact.
 */
export function AdminLocaleSwitcher({
  current,
  label,
  className,
}: {
  current: AdminLocale;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={label}
          disabled={pending}
          className={cn('gap-1.5 px-2.5', className)}
        >
          <Globe className="size-[1.05rem]" />
          <span className="text-xs font-semibold tracking-widest">
            {localeMetadata[current].label}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[11rem]">
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(next) =>
            startTransition(async () => {
              await setAdminLocale(next);
              router.refresh();
            })
          }
        >
          {adminLocales.map((locale) => (
            <DropdownMenuRadioItem key={locale} value={locale}>
              <span className="w-6 text-xs font-semibold tracking-widest text-muted-foreground">
                {localeMetadata[locale].label}
              </span>
              {localeMetadata[locale].nativeName}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

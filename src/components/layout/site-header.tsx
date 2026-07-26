'use client';

import { ChevronDown, Menu, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { LocaleSwitcher } from '@/components/common/locale-switcher';
import { Wordmark } from '@/components/common/wordmark';
import { ThemeToggle, type ThemeToggleLabels } from '@/components/common/theme-toggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { localizeHref, stripLocale, type Locale } from '@/lib/i18n/config';
import { isActivePath, type ResolvedNavItem } from '@/lib/navigation';
import { cn } from '@/lib/utils/cn';

export interface SiteHeaderLabels {
  siteName: string;
  shortName: string;
  region: string;
  register: string;
  openMenu: string;
  closeMenu: string;
  menu: string;
  language: string;
  skipToContent: string;
  theme: ThemeToggleLabels;
}

interface SiteHeaderProps {
  locale: Locale;
  nav: ResolvedNavItem[];
  labels: SiteHeaderLabels;
}

/**
 * Sticky site header.
 *
 * It keeps a translucent ivory background even at the top of the page rather than going
 * fully transparent over the hero. The hero photograph is a sunlit Registan — dark
 * mosaic on the right, blown-out sky in the middle — and no single text colour stays
 * legible across it. Past ~24px of scroll the panel deepens and gains a hairline, which
 * is the part that actually communicates "you have scrolled".
 */
export function SiteHeader({ locale, nav, labels }: SiteHeaderProps) {
  const pathname = usePathname();
  const path = stripLocale(pathname);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll(); // A refresh mid-page must not start in the transparent state.
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the drawer on navigation — Next keeps the layout mounted across route changes,
  // so nothing else would.
  useEffect(() => setMobileOpen(false), [pathname]);

  const href = (to: string) => localizeHref(to, locale);

  return (
    <>
      <a
        href="#main"
        className={cn(
          'sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60]',
          'focus:rounded-md focus:bg-primary focus:px-4 focus:py-2.5',
          'focus:text-sm focus:font-medium focus:text-primary-foreground',
        )}
      >
        {labels.skipToContent}
      </a>

      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-luxe',
          scrolled
            ? 'border-b border-border/80 bg-background/85 backdrop-blur-xl shadow-card py-1'
            : 'border-b border-transparent bg-background/15 sm:bg-background/10 backdrop-blur-md py-2',
        )}
      >
        <div className="container flex h-header items-center gap-4">
          <Link href={href('/')} className="group shrink-0" aria-label={labels.siteName}>
            <Wordmark
              name={labels.shortName}
              region={labels.region}
              gradientId="brand-header"
              className="hidden sm:flex"
            />
            <Wordmark
              name={labels.shortName}
              region={labels.region}
              size="sm"
              gradientId="brand-header-sm"
              className="sm:hidden"
            />
          </Link>

          {/* Eight uppercase items only fit comfortably from xl up; below that the
              drawer takes over, rather than letting the nav wrap or squeeze. */}
          <nav aria-label={labels.menu} className="ms-auto hidden items-center gap-0.5 xl:flex">
            {nav.map((item) =>
              item.children ? (
                <NavGroup key={item.href} item={item} path={path} localize={href} />
              ) : (
                <NavLink key={item.href} href={href(item.href)} active={isActivePath(item.href, path)}>
                  {item.label}
                </NavLink>
              ),
            )}
          </nav>

          <div className="ms-auto flex items-center gap-1 xl:ms-3">
            {/* useSearchParams() suspends; without this boundary every page that renders
                the header would opt out of static generation. */}
            <Suspense fallback={<div className="size-9" aria-hidden />}>
              <LocaleSwitcher currentLocale={locale} label={labels.language} />
            </Suspense>
            <ThemeToggle labels={labels.theme} />

            {/* Once the eight-item nav appears at xl there is no room left for the
                label — the container tops out at 1360px, so it would overflow at every
                width. The CTA collapses to its glyph instead; `aria-label` keeps the
                accessible name in both states. */}
            <Button
              asChild
              variant="gold"
              size="sm"
              pill
              className="ms-1 hidden shrink-0 px-5 sm:inline-flex xl:px-2.5"
            >
              <Link href={href('/registration')} aria-label={labels.register}>
                <UserRound />
                <span className="text-xs font-semibold uppercase tracking-[0.1em] xl:hidden">
                  {labels.register}
                </span>
              </Link>
            </Button>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="xl:hidden" aria-label={labels.openMenu}>
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" closeLabel={labels.closeMenu} className="gap-0 px-6 py-6">
                <SheetTitle className="sr-only">{labels.menu}</SheetTitle>

                <Link href={href('/')} className="group">
                  <Wordmark
                    name={labels.shortName}
                    region={labels.region}
                    size="sm"
                    gradientId="brand-drawer"
                  />
                </Link>

                <nav aria-label={labels.menu} className="mt-8 flex flex-col">
                  {nav.map((item) => (
                    <div key={item.href}>
                      <SheetClose asChild>
                        <Link
                          href={href(item.href)}
                          className={cn(
                            'block border-b border-border/60 py-3.5 font-display text-xl transition-colors',
                            isActivePath(item.href, path) ? 'text-primary' : 'hover:text-primary',
                          )}
                        >
                          {item.label}
                        </Link>
                      </SheetClose>
                      {item.children?.map((child) => (
                        <SheetClose asChild key={child.href}>
                          <Link
                            href={href(child.href)}
                            className={cn(
                              'block border-b border-border/60 py-2.5 ps-4 text-sm transition-colors',
                              isActivePath(child.href, path)
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {child.label}
                          </Link>
                        </SheetClose>
                      ))}
                    </div>
                  ))}
                </nav>

                <SheetClose asChild>
                  <Button asChild size="lg" pill className="mt-8 w-full">
                    <Link href={href('/registration')}>{labels.register}</Link>
                  </Button>
                </SheetClose>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative whitespace-nowrap rounded-md px-2.5 py-2 text-xs font-semibold uppercase',
        'tracking-[0.08em] transition-all duration-300 2xl:px-3 2xl:text-[0.8125rem]',
        'after:absolute after:inset-x-2.5 after:bottom-1 after:h-[2px] after:origin-center',
        'after:bg-gold after:rounded-full after:transition-transform after:duration-300 after:ease-luxe',
        active
          ? 'text-primary font-bold after:scale-x-100'
          : 'text-foreground/90 after:scale-x-0 hover:text-primary hover:after:scale-x-100',
      )}
    >
      {children}
    </Link>
  );
}

/**
 * A nav entry with children (Gallery → photos / videos).
 *
 * Opens on hover *and* on focus, and the panel stays inside the same
 * `onMouseLeave` region as the trigger so the pointer can travel down into it. Keyboard
 * users reach it through normal tab order — the links are always in the DOM, only
 * visually hidden — which avoids the usual hover-menu keyboard trap.
 */
function NavGroup({
  item,
  path,
  localize,
}: {
  item: ResolvedNavItem;
  path: string;
  localize: (to: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const active = item.children!.some((child) => isActivePath(child.href, path));

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Link
        href={localize(item.href)}
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-2 text-xs font-semibold',
          'uppercase tracking-[0.08em] transition-colors duration-300 2xl:px-3 2xl:text-[0.8125rem]',
          active ? 'text-primary font-bold' : 'text-foreground/90 hover:text-primary',
        )}
      >
        {item.label}
        <ChevronDown
          className={cn('size-3.5 transition-transform duration-300', open && 'rotate-180')}
        />
      </Link>

      <div
        className={cn(
          'absolute start-0 top-full min-w-[11rem] pt-2 transition-all duration-200 ease-luxe',
          open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0',
        )}
      >
        <div className="overflow-hidden rounded-md border border-border bg-popover p-1.5 shadow-lift">
          {item.children!.map((child) => (
            <Link
              key={child.href}
              href={localize(child.href)}
              className={cn(
                'block rounded-sm px-3 py-2 text-sm transition-colors',
                isActivePath(child.href, path)
                  ? 'bg-accent text-primary'
                  : 'text-foreground/80 hover:bg-accent hover:text-foreground',
              )}
            >
              {child.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

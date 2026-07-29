import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * The site map, declared once.
 *
 * Labels are stored as a *resolver* rather than a dotted key string ("nav.about"), so a
 * renamed or deleted dictionary key is a compile error here instead of a `undefined`
 * rendered into the header at runtime.
 */
export interface NavItem {
  href: string;
  label: (d: Dictionary) => string;
  children?: NavItem[];
}

/** Primary header navigation. `gallery` groups the photo and video archives. */
export const primaryNav: readonly NavItem[] = [
  { href: '/', label: (d) => d.nav.home },
  { href: '/about', label: (d) => d.nav.about },
  {
    // Grouped like the gallery: the sheet music is an annex to the Regulations, and a
    // ninth top-level item would push the header into wrapping on a laptop.
    href: '/regulations',
    label: (d) => d.nav.regulations,
    children: [
      { href: '/regulations', label: (d) => d.nav.regulations },
      { href: '/notes', label: (d) => d.nav.notes },
    ],
  },
  { href: '/judges', label: (d) => d.nav.judges },
  { href: '/news', label: (d) => d.nav.news },
  {
    href: '/gallery',
    label: (d) => d.nav.gallery,
    children: [
      { href: '/gallery', label: (d) => d.nav.photos },
      { href: '/videos', label: (d) => d.nav.videos },
    ],
  },
  { href: '/winners', label: (d) => d.nav.winners },
  { href: '/contact', label: (d) => d.nav.contact },
] as const;

/** Footer column: everything an applicant needs, separate from the browse links. */
export const participantNav: readonly NavItem[] = [
  { href: '/registration', label: (d) => d.nav.register },
  { href: '/regulations', label: (d) => d.nav.regulations },
  { href: '/notes', label: (d) => d.nav.notes },
  { href: '/contact', label: (d) => d.nav.contact },
] as const;

/** Editorial pages served from the `pages` table, linked in the footer legal row. */
export const legalNav: readonly NavItem[] = [
  { href: '/p/privacy', label: (d) => d.footer.privacy },
  { href: '/p/terms', label: (d) => d.footer.terms },
] as const;

/**
 * Flattened list of every static public route, for the sitemap and for prefetch hints.
 * `/p/[slug]` and the other dynamic segments are enumerated from the database instead.
 */
export const staticRoutes: readonly string[] = [
  '/',
  '/about',
  '/regulations',
  '/notes',
  '/judges',
  '/news',
  '/gallery',
  '/videos',
  '/winners',
  '/contact',
  '/registration',
] as const;

/** A nav item whose label has been resolved — plain data, safe to cross to a Client Component. */
export interface ResolvedNavItem {
  href: string;
  label: string;
  children?: ResolvedNavItem[];
}

/**
 * Resolve label functions against a dictionary on the server.
 *
 * `hrefs` stay locale-free here; the header localizes them at render time with
 * `localizeHref`, which keeps active-path matching a plain string comparison.
 */
export function resolveNav(items: readonly NavItem[], d: Dictionary): ResolvedNavItem[] {
  return items.map((item) => ({
    href: item.href,
    label: item.label(d),
    ...(item.children ? { children: resolveNav(item.children, d) } : {}),
  }));
}

/**
 * Is `href` the current page, or an ancestor of it?
 *
 * Compared on locale-stripped paths. `/news` must stay highlighted while the visitor
 * reads `/news/some-article`, but `/` must not match everything.
 */
export function isActivePath(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

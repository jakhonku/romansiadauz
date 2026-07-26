import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { clientEnv } from '@/lib/env';
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  defaultLocale,
  isLocale,
  locales,
  type Locale,
} from '@/lib/i18n/config';

/**
 * Middleware has two jobs:
 *
 *   1. `/admin/*` — keep the Supabase session token fresh and bounce anonymous
 *      visitors to the login screen.
 *   2. everything else — make sure the visitor is on a locale-prefixed URL.
 *
 * Note what it deliberately does NOT do: check the caller's *role*. That would cost a
 * database round-trip on every admin navigation, and middleware is the weakest of the
 * three enforcement points anyway. Roles are checked in the admin layout (server-side,
 * before any UI renders), in every Server Action, and finally by RLS in the database.
 * Middleware answers "are you signed in?", not "are you allowed?".
 */

function negotiateLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  const header = request.headers.get('accept-language');
  if (header) {
    // "ru-RU,ru;q=0.9,en;q=0.8" → ordered list of base language tags.
    const preferences = header
      .split(',')
      .map((part) => {
        const [tag, q] = part.trim().split(';q=');
        return { tag: tag.split('-')[0]!.toLowerCase(), quality: q ? Number(q) : 1 };
      })
      .sort((a, b) => b.quality - a.quality);

    for (const preference of preferences) {
      if (isLocale(preference.tag)) return preference.tag;
    }
  }

  return defaultLocale;
}

async function handleAdmin(request: NextRequest): Promise<NextResponse> {
  // The response object must be created first and threaded through the Supabase
  // client, because a refreshed token has to be written onto *this* response — a
  // freshly constructed one later would discard the new cookies.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // getUser() revalidates the JWT against Supabase. getSession() only decodes the
  // cookie, which a client could forge — never use it for an authorisation decision.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isLoginRoute = pathname === '/admin/login';

  if (!user && !isLoginRoute) {
    const loginUrl = new URL('/admin/login', request.url);
    // Preserve where they were heading so login can return them there.
    if (pathname !== '/admin') loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isLoginRoute) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return response;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    return handleAdmin(request);
  }

  // Already locale-prefixed — remember the choice and continue.
  const firstSegment = pathname.split('/')[1];
  if (isLocale(firstSegment)) {
    const response = NextResponse.next();
    if (request.cookies.get(LOCALE_COOKIE)?.value !== firstSegment) {
      response.cookies.set(LOCALE_COOKIE, firstSegment, {
        maxAge: LOCALE_COOKIE_MAX_AGE,
        path: '/',
        sameSite: 'lax',
      });
    }
    return response;
  }

  const locale = negotiateLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;

  const response = NextResponse.redirect(url);
  response.cookies.set(LOCALE_COOKIE, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  });
  return response;
}

export const config = {
  matcher: [
    /**
     * Everything except Next internals, the metadata routes and anything with a file
     * extension. Excluding `sitemap.xml`/`robots.txt` matters: a redirect to
     * `/uz/sitemap.xml` would make both files unreachable to crawlers.
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|images/|fonts/|.*\\.[\\w]+$).*)',
  ],
};

export const runtime = 'nodejs';

// Referenced so the array is not tree-shaken out of the type-check in future edits.
export type { Locale };
export { locales };

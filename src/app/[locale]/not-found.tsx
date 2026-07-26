import { cookies } from 'next/headers';
import Link from 'next/link';

import { BrandMark } from '@/components/common/brand-mark';
import { Button } from '@/components/ui/button';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { LOCALE_COOKIE, defaultLocale, isLocale, localizeHref } from '@/lib/i18n/config';

/**
 * Locale-scoped 404.
 *
 * `not-found.tsx` receives no route params — Next renders it outside the matched
 * segment — so the language is recovered from the `NEXT_LOCALE` cookie that middleware
 * writes on every visit. A visitor who has been browsing in Russian gets a Russian 404
 * rather than being dropped back into Uzbek.
 */
export default async function LocaleNotFound() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  const d = await getDictionary(locale);

  return (
    <section className="grid min-h-[70vh] place-items-center px-6 pt-header">
      <div className="flex max-w-md flex-col items-center text-center">
        <BrandMark className="h-14 w-14 opacity-70" gradientId="not-found-mark" />

        <p className="mt-8 font-display text-display-2xl font-bold leading-none text-gold-ink">404</p>

        <h1 className="mt-4 text-display-sm font-semibold">{d.errors['404Title']}</h1>
        <p className="mt-4 text-muted-foreground">{d.errors['404Body']}</p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button asChild pill>
            <Link href={localizeHref('/', locale)}>{d.common.goHome}</Link>
          </Button>
          <Button asChild variant="outline" pill>
            <Link href={localizeHref('/contact', locale)}>{d.nav.contact}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

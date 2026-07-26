import Link from 'next/link';

import { BrandMark } from '@/components/common/brand-mark';
import { Button } from '@/components/ui/button';

/**
 * Locale-scoped 404.
 *
 * Deliberately reads nothing from the request. An earlier version resolved the language
 * from the `NEXT_LOCALE` cookie, which was a real bug: `cookies()` opts the page into
 * dynamic rendering, and a dynamically-rendered not-found boundary loses its 404 status
 * — every missing article answered `200 OK` with "page not found" in the body. That is
 * a soft 404, and search engines treat it as a thin duplicate page rather than a
 * deletion.
 *
 * `not-found.tsx` also receives no route params, so there is no way to know the locale
 * without touching the request. The copy is therefore trilingual and static, the same
 * approach `error.tsx` takes and for the same reason: this boundary must be the one
 * thing on the site that cannot itself fail.
 */
export default function LocaleNotFound() {
  return (
    <section className="grid min-h-[70vh] place-items-center px-6 pt-header">
      <div className="flex max-w-lg flex-col items-center text-center">
        <BrandMark className="h-14 w-14 opacity-70" />

        <p className="mt-8 font-display text-display-2xl font-bold leading-none text-gold-ink">
          404
        </p>

        <h1 className="mt-4 text-display-sm font-semibold">Sahifa topilmadi</h1>

        <div className="mt-4 space-y-1.5 text-muted-foreground">
          <p>Siz qidirgan sahifa mavjud emas yoki boshqa manzilga ko&apos;chirilgan.</p>
          <p lang="ru">Запрашиваемая страница не существует или была перемещена.</p>
          <p lang="en">This page does not exist or has been moved.</p>
        </div>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          {/*
            Relative links, not `localizeHref`: with no locale available, `/` lets
            middleware negotiate the visitor's language exactly as it does on a first
            visit, rather than guessing wrong and sending a Russian speaker to /uz.
          */}
          <Button asChild pill>
            <Link href="/">Bosh sahifa · Главная · Home</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

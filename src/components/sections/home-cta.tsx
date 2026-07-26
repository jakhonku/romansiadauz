import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { BrandMark } from '@/components/common/brand-mark';
import { Reveal } from '@/components/motion/reveal';
import { Button } from '@/components/ui/button';
import { localizeHref, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * Closing call to action — the last thing on the home page, and the second-most
 * important conversion point after the hero.
 *
 * Rendered on bordeaux so it reads as a destination rather than one more content band.
 * The buttons invert accordingly: the primary becomes ivory-on-bordeaux, since the
 * usual bordeaux fill would vanish into the background.
 */
export function HomeCta({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const c = dictionary.home.cta;

  return (
    <section className="relative isolate overflow-hidden bg-primary text-primary-foreground dark:text-white">
      {/* Two soft gold blooms give the flat bordeaux some depth without a texture asset. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -start-24 -top-32 size-[30rem] rounded-full bg-gold/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -end-20 size-[26rem] rounded-full bg-gold/10 blur-3xl"
      />

      <div className="container relative py-section">
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <BrandMark className="h-12 w-12" gradientId="cta-mark" />

          <p className="kicker mt-8 text-gold-soft">{c.kicker}</p>
          <h2 className="mt-4 text-display-lg font-semibold">{c.title}</h2>
          <p className="mt-5 text-base leading-relaxed text-primary-foreground/80 dark:text-white/80 sm:text-lg">
            {c.body}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              pill
              className="group bg-primary-foreground text-primary hover:bg-primary-foreground/90 dark:bg-white dark:text-primary"
            >
              <Link href={localizeHref('/registration', locale)}>
                <span className="text-xs font-semibold uppercase tracking-[0.14em]">{c.primary}</span>
                <ArrowRight className="transition-transform duration-300 ease-luxe group-hover:translate-x-1" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              pill
              variant="outline"
              className="border-primary-foreground/40 text-primary-foreground hover:border-gold-soft hover:bg-primary-foreground/10 dark:border-white/40 dark:text-white dark:hover:bg-white/10"
            >
              <Link href={localizeHref('/regulations', locale)}>
                <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                  {c.secondary}
                </span>
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

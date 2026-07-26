import { ArrowRight, CalendarDays, MapPin, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Countdown } from '@/components/common/countdown';
import { Parallax } from '@/components/motion/parallax';
import { Reveal } from '@/components/motion/reveal';
import { Button } from '@/components/ui/button';
import { localizeHref, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { siteConfig } from '@/lib/site-config';

/**
 * The home hero: sunlit Registan running off the right edge, festival lockup on the
 * left over an ivory veil.
 *
 * The veil (`bg-hero-veil`) is a horizontal gradient rather than a flat scrim over the
 * whole photograph — a full scrim would mute the sunset the composition depends on,
 * while the gradient keeps the left third opaque enough for AA-contrast text and lets
 * the right two thirds stay untouched.
 */
export function HomeHero({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const h = dictionary.home.hero;
  const href = (to: string) => localizeHref(to, locale);

  const facts = [
    { icon: CalendarDays, label: h.facts.annual },
    { icon: MapPin, label: h.facts.location },
    { icon: Users, label: h.facts.talents },
  ];

  return (
    <section className="relative isolate overflow-hidden bg-surface">
      <div className="absolute inset-0 -z-10">
        <Parallax className="absolute inset-0" distance={70} scaleTo={1.08}>
          <Image
            src="/images/hero-registan.png"
            alt={h.imageAlt}
            fill
            // The hero is the LCP element on the most-visited page: it must not wait for
            // the lazy-loading observer, and it needs the highest fetch priority.
            priority
            fetchPriority="high"
            sizes="100vw"
            className="object-cover object-[70%_center]"
          />
        </Parallax>

        {/* Ivory veil, left → right. Reversed under RTL is unnecessary: all three
            locales are LTR, so a static direction keeps the gradient honest. */}
        <div aria-hidden className="absolute inset-0 bg-hero-veil" />
        {/* Vertical fade so the header and the stats band both sit on calm pixels. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background/80 to-transparent"
        />
      </div>

      <div className="container relative pb-24 pt-[calc(theme(spacing.header)+4rem)] sm:pb-28 lg:pb-36 lg:pt-[calc(theme(spacing.header)+7rem)]">
        <div className="max-w-2xl lg:max-w-3xl">
          <Reveal delay={0.05}>
            <p className="kicker flex items-center gap-3">
              {h.kicker}
              <span aria-hidden className="h-px w-16 bg-gold/70" />
            </p>
          </Reveal>

          <h1 className="mt-6">
            <Reveal delay={0.12}>
              <span className="block font-display text-5xl sm:text-6xl lg:text-7xl xl:text-[5.5rem] font-bold uppercase tracking-[0.02em] text-primary leading-none">
                {h.title}
              </span>
            </Reveal>
            <Reveal delay={0.2}>
              <span className="mt-4 flex items-center gap-4">
                <span aria-hidden className="h-px flex-none basis-8 bg-gold/70 sm:basis-12" />
                <span className="font-display text-base sm:text-lg lg:text-xl font-medium uppercase tracking-[0.22em] text-gold-ink">
                  {h.subtitle}
                </span>
                <span aria-hidden className="h-px flex-1 bg-gold/70" />
              </span>
            </Reveal>
          </h1>

          <Reveal delay={0.28}>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-foreground/85 sm:text-xl">
              {h.tagline}
            </p>
          </Reveal>
          <Countdown labels={h.countdown} target={siteConfig.festivalStartsAt} />
          <Reveal delay={0.36}>
            <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-5">
              {facts.map((fact) => (
                <li key={fact.label} className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full border border-gold/50 text-gold">
                    <fact.icon className="size-[1.15rem]" />
                  </span>
                  <span className="max-w-[9rem] text-xs font-semibold uppercase leading-snug tracking-[0.12em] text-foreground/75">
                    {fact.label}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.44}>
            <div className="mt-11 flex flex-wrap gap-4">
              <Button asChild size="lg" className="group">
                <Link href={href('/registration')}>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                    {h.ctaPrimary}
                  </span>
                  <ArrowRight className="transition-transform duration-300 ease-luxe group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="gold" size="lg" className="group">
                <Link href={href('/about')}>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                    {h.ctaSecondary}
                  </span>
                  <ArrowRight className="transition-transform duration-300 ease-luxe group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

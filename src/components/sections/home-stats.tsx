import { Globe2, Music4, Trophy, Users } from 'lucide-react';

import { CountUp } from '@/components/motion/count-up';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { siteConfig } from '@/lib/site-config';

import type { SiteStats } from '@/server/queries/settings';

/**
 * Bordeaux statistics band directly beneath the hero.
 *
 * Deliberately a separate section rather than an absolutely-positioned strip inside the
 * hero: overlapping it would force the hero to reserve height for it at every
 * breakpoint, and the band would collide with the CTAs once the Russian copy — which
 * runs ~20% longer than the Uzbek — wraps to a third line.
 */
export function HomeStats({
  locale,
  dictionary,
  stats,
}: {
  locale: Locale;
  dictionary: Dictionary;
  stats?: SiteStats;
}) {
  const s = dictionary.home.stats;
  const data = stats ?? siteConfig.stats;

  const items = [
    { icon: Trophy, value: data.years, suffix: '+', label: s.years },
    { icon: Users, value: data.participants, suffix: '+', label: s.participants },
    { icon: Globe2, value: data.countries, suffix: '+', label: s.countries },
    { icon: Music4, value: data.goal, suffix: '', label: s.goal },
  ];

  return (
    <section aria-labelledby="home-stats-title" className="bg-primary text-primary-foreground dark:text-white">
      <h2 id="home-stats-title" className="sr-only">
        {s.title}
      </h2>

      <Stagger className="container grid grid-cols-2 gap-y-10 py-12 sm:py-14 lg:grid-cols-4" gap={0.12}>
        {items.map((item) => (
          <StaggerItem
            key={item.label}
            className="flex items-center justify-center gap-4 px-2 lg:border-e lg:border-primary-foreground/15 dark:lg:border-white/20 lg:last:border-e-0"
          >
            <item.icon className="size-8 shrink-0 text-gold-soft dark:text-white" aria-hidden />
            <div className="min-w-0">
              <CountUp
                value={item.value}
                suffix={item.suffix}
                locale={locale}
                className="block font-display text-display-sm font-bold leading-none text-primary-foreground dark:text-white"
              />
              <span className="mt-1.5 block text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-primary-foreground/75 dark:text-white/85">
                {item.label}
              </span>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

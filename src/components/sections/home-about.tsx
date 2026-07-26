import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Reveal } from '@/components/motion/reveal';
import { Button } from '@/components/ui/button';
import { localizeHref, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * The "what is Romansiada" section.
 *
 * Copy-only — this text is editorial constant, not database content, so it lives in the
 * dictionaries where a translator can reach it without an admin login.
 *
 * Two columns at desktop: the heading holds the left rail while the lead and body run
 * on the right, which gives the long Russian translation room to breathe without
 * pushing the heading off-screen.
 */
export function HomeAbout({ locale, dictionary }: { locale: Locale; dictionary: Dictionary }) {
  const a = dictionary.home.about;

  return (
    <section className="section bg-background">
      <div className="container grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Reveal>
          <p className="kicker flex items-center gap-3">
            <span aria-hidden className="h-px w-8 bg-gold" />
            {a.kicker}
          </p>
          <h2 className="mt-5 text-display-lg font-semibold">{a.title}</h2>
        </Reveal>

        <Reveal delay={0.1} className="flex flex-col">
          <p className="text-lg leading-relaxed text-foreground/90">{a.lead}</p>
          <p className="mt-6 leading-relaxed text-muted-foreground">{a.body}</p>

          <Button asChild variant="gold" pill className="group mt-9 self-start">
            <Link href={localizeHref('/about', locale)}>
              <span className="text-xs font-semibold uppercase tracking-[0.14em]">{a.cta}</span>
              <ArrowRight className="transition-transform duration-300 ease-luxe group-hover:translate-x-1" />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}

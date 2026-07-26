import Image from 'next/image';

import { Reveal } from '@/components/motion/reveal';
import { SectionHeading } from '@/components/sections/section-heading';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { PartnerSummary } from '@/types/content';
import { cn } from '@/lib/utils/cn';

/**
 * Partner logo marquee.
 *
 * The track holds the list twice and translates by -50%, so the loop is seamless — the
 * second copy is `aria-hidden`, since a screen reader announcing every sponsor twice is
 * the classic marquee accessibility failure.
 *
 * WCAG 2.2.2 requires a mechanism to pause any motion that starts automatically and
 * runs more than five seconds. This one pauses on hover *and* on focus-within, so a
 * keyboard user tabbing onto a partner link can read it while it holds still.
 *
 * Under `prefers-reduced-motion` the animation is dropped and the track wraps into a
 * static row; the duplicate set is hidden so nothing is listed twice.
 */
export function HomePartners({
  dictionary,
  partners,
}: {
  dictionary: Dictionary;
  partners: PartnerSummary[];
}) {
  const p = dictionary.home.partners;

  // With nothing to show, the section is omitted entirely rather than rendering an
  // empty-state box: a "no partners yet" placard reads as a weakness on a home page,
  // and unlike news or events, absent sponsors are not information a visitor wants.
  if (!partners.length) return null;

  return (
    <section className="section-sm overflow-hidden bg-surface">
      <div className="container">
        <SectionHeading kicker={p.kicker} title={p.title} subtitle={p.subtitle} />
      </div>

      <Reveal className="relative mt-12">
        {/* Fade the ends so logos dissolve rather than being sliced by the viewport. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-0 z-10 w-16 bg-gradient-to-r from-surface to-transparent sm:w-28"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 end-0 z-10 w-16 bg-gradient-to-l from-surface to-transparent sm:w-28"
        />

        <div
          className={cn(
            'flex w-max animate-marquee items-center gap-14 hover:marquee-paused focus-within:marquee-paused',
            'motion-reduce:w-full motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center',
          )}
          style={{ ['--marquee-duration' as string]: `${Math.max(24, partners.length * 6)}s` }}
        >
          {partners.map((partner) => (
            <PartnerLogo key={partner.id} partner={partner} />
          ))}
          <div
            aria-hidden
            className="flex items-center gap-14 motion-reduce:hidden"
          >
            {partners.map((partner) => (
              <PartnerLogo key={`dup-${partner.id}`} partner={partner} duplicate />
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function PartnerLogo({ partner, duplicate = false }: { partner: PartnerSummary; duplicate?: boolean }) {
  const logo = partner.logoUrl ? (
    <>
      <Image
        src={partner.logoUrl}
        alt={duplicate ? '' : partner.name}
        width={200}
        height={80}
        sizes="200px"
        className={cn(
          'h-12 w-auto object-contain opacity-70 transition-opacity duration-300 hover:opacity-100',
          partner.logoDarkUrl && 'dark:hidden',
        )}
      />
      {partner.logoDarkUrl ? (
        <Image
          src={partner.logoDarkUrl}
          alt={duplicate ? '' : partner.name}
          width={200}
          height={80}
          sizes="200px"
          className="hidden h-12 w-auto object-contain opacity-70 transition-opacity duration-300 hover:opacity-100 dark:block"
        />
      ) : null}
    </>
  ) : (
    // No asset uploaded yet — the name in small caps is a better placeholder than a
    // broken-image icon, and it still credits the partner.
    <span className="whitespace-nowrap text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {partner.name}
    </span>
  );

  if (partner.websiteUrl && !duplicate) {
    return (
      <a
        href={partner.websiteUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="shrink-0"
      >
        {logo}
      </a>
    );
  }

  return <span className="shrink-0">{logo}</span>;
}

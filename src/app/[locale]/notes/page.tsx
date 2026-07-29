import { Download, FileMusic, Eye } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Reveal } from '@/components/motion/reveal';
import { PageHero } from '@/components/sections/page-hero';
import { SectionHeading } from '@/components/sections/section-heading';
import { scoreRepertoire, type VoiceKey } from '@/content/scores';
import { isLocale, localizeHref, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { interpolate } from '@/lib/i18n/format';
import { buildMetadata } from '@/lib/seo/metadata';
import { scoreUrl } from '@/lib/supabase/storage';

export const revalidate = 3600;

/**
 * The recommended repertoire, with the score behind each entry.
 *
 * Two links per work rather than one, because they are two different intentions: a
 * singer choosing between twenty romances wants to glance at the first page in a browser
 * tab, and one who has chosen wants the file on the music stand. A single link would
 * serve whichever the browser happened to prefer.
 *
 * Titles and credits come from `content/scores.ts` and are the same in all three
 * languages — see the note there. Only the chrome around them is translated.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = await getDictionary(locale);

  return buildMetadata({
    locale,
    path: '/notes',
    title: d.notes.title,
    description: d.notes.subtitle,
  });
}

export default async function NotesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const d = await getDictionary(locale);
  const n = d.notes;

  const voiceLabel: Record<VoiceKey, string> = {
    bass: n.voices.bass,
    baritone: n.voices.baritone,
    tenor: n.voices.tenor,
    mezzo: n.voices.mezzo,
    soprano: n.voices.soprano,
  };

  return (
    <>
      <PageHero
        kicker={d.nav.regulations}
        title={n.title}
        subtitle={n.subtitle}
        crumbs={[
          { label: d.nav.home, href: localizeHref('/', locale as Locale) },
          { label: d.nav.regulations, href: localizeHref('/regulations', locale as Locale) },
          { label: n.title },
        ]}
      />

      <section className="section-sm bg-background">
        <div className="container">
          <Reveal className="mx-auto max-w-3xl">
            <div className="flex flex-col gap-3 rounded-card border border-gold/30 bg-surface p-6 sm:p-8">
              {n.intro.map((paragraph) => (
                <p key={paragraph} className="text-[0.9375rem] leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {scoreRepertoire.map((group, index) => (
        <section
          key={group.voice}
          className={index % 2 === 0 ? 'section-sm bg-surface' : 'section-sm bg-background'}
        >
          <div className="container">
            <SectionHeading
              kicker={interpolate(n.count, { count: group.scores.length })}
              title={voiceLabel[group.voice]}
              align="start"
            />

            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              {group.scores.map((score) => (
                <li key={`${group.voice}-${score.title}-${score.file ?? 'none'}`}>
                  <article className="flex h-full flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card sm:flex-row sm:items-center">
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gold/10">
                      <FileMusic className="size-5 text-gold-ink" aria-hidden />
                    </span>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-base font-semibold leading-snug">
                        {score.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">{score.credit}</p>
                    </div>

                    {score.file ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <a
                          href={scoreUrl(score.file)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:border-gold hover:bg-accent"
                        >
                          <Eye className="size-4" aria-hidden />
                          <span>{n.view}</span>
                          <span className="sr-only"> — {score.title}</span>
                        </a>

                        <a
                          href={scoreUrl(score.file, score.fileName)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                        >
                          <Download className="size-4" aria-hidden />
                          <span>{n.download}</span>
                          <span className="sr-only"> — {score.title}</span>
                        </a>
                      </div>
                    ) : (
                      <p className="shrink-0 text-xs font-medium text-muted-foreground">
                        {n.missing}
                      </p>
                    )}
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </>
  );
}

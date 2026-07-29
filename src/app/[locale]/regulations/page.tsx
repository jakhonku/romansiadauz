import { ArrowRight, Mail, Music4, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Reveal } from '@/components/motion/reveal';
import { PageHero } from '@/components/sections/page-hero';
import { Button } from '@/components/ui/button';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, localizeHref, type Locale } from '@/lib/i18n/config';
import { buildMetadata } from '@/lib/seo/metadata';

export const revalidate = 3600;

/**
 * The competition regulations, as approved.
 *
 * This page renders a document, not a CMS entry. The text lives in the dictionaries so
 * that all three languages are versioned with the code and cannot drift apart or be
 * edited into disagreement — a rule an applicant is held to should not be a row someone
 * can quietly change. Revising it between seasons is a deliberate act: edit the three
 * `regulations` blocks and deploy.
 *
 * Structure comes from the document's own punctuation. A line that opens with an em dash
 * or a hyphen is one of its bullets, so consecutive ones are gathered into a list and
 * everything else is a paragraph — no parallel markup to keep in step with the wording.
 */

type Block = { kind: 'paragraph'; text: string } | { kind: 'list'; items: string[] };

function toBlocks(body: readonly string[]): Block[] {
  const blocks: Block[] = [];

  for (const line of body) {
    const bullet = /^[—-]\s*/.exec(line);

    if (!bullet) {
      blocks.push({ kind: 'paragraph', text: line });
      continue;
    }

    const item = line.slice(bullet[0].length);
    const previous = blocks[blocks.length - 1];

    if (previous?.kind === 'list') previous.items.push(item);
    else blocks.push({ kind: 'list', items: [item] });
  }

  return blocks;
}

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
    path: '/regulations',
    title: d.regulations.title,
    description: d.regulations.subtitle,
  });
}

export default async function RegulationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const d = await getDictionary(locale);
  const r = d.regulations;

  return (
    <>
      <PageHero
        kicker={d.nav.regulations}
        title={r.title}
        subtitle={r.subtitle}
        crumbs={[
          { label: d.nav.home, href: localizeHref('/', locale as Locale) },
          { label: d.nav.regulations },
        ]}
      />

      <section className="section bg-background">
        <div className="container">
          <article className="mx-auto max-w-3xl">
            {/* The approval block sits at the head of the paper document; keeping it
                keeps the page recognisable as the same document rather than a summary
                of it. */}
            <Reveal>
              <div className="grid gap-8 border-b border-border pb-10 sm:grid-cols-2">
                {r.approvals.map((approval) => (
                  <div key={approval.name}>
                    <p className="text-kicker font-semibold uppercase tracking-[0.18em] text-gold-ink">
                      {r.approvalLabel}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {approval.role}
                    </p>
                    <p className="mt-3 border-t border-border pt-3 text-sm font-medium">
                      {approval.name}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal>
              <h2 className="mt-12 text-center font-display text-display-sm font-semibold leading-tight">
                {r.documentTitle}
              </h2>
            </Reveal>

            {r.sections.map((section) => (
              <Reveal key={section.number}>
                <section className="mt-14">
                  <h3 className="font-display text-xl font-semibold">
                    <span className="text-gold-ink">{section.number}</span>{' '}
                    <span>{section.title}</span>
                  </h3>

                  <div className="mt-5 flex flex-col gap-4">
                    {toBlocks(section.body).map((block, index) =>
                      block.kind === 'paragraph' ? (
                        <p key={index} className="text-[0.9375rem] leading-relaxed">
                          {block.text}
                        </p>
                      ) : (
                        <ul key={index} className="flex flex-col gap-2.5 ps-1">
                          {block.items.map((item) => (
                            <li key={item} className="flex gap-3 text-[0.9375rem] leading-relaxed">
                              <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-gold" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ),
                    )}
                  </div>
                </section>
              </Reveal>
            ))}

            <Reveal>
              <section className="mt-14 rounded-card border border-border bg-surface p-6 shadow-card sm:p-8">
                <h3 className="font-display text-lg font-semibold">{r.contacts.title}</h3>

                <dl className="mt-5 flex flex-col gap-3 text-[0.9375rem]">
                  <div className="flex items-center gap-3">
                    <dt>
                      <Phone className="size-4 text-gold" aria-hidden />
                      <span className="sr-only">{d.contact.phone}</span>
                    </dt>
                    <dd>
                      <a
                        href={`tel:${r.contacts.phone.replace(/[^\d+]/g, '')}`}
                        className="transition-colors hover:text-primary"
                      >
                        {r.contacts.phone}
                      </a>
                    </dd>
                  </div>

                  <div className="flex items-center gap-3">
                    <dt>
                      <Mail className="size-4 text-gold" aria-hidden />
                      <span className="sr-only">{d.contact.email}</span>
                    </dt>
                    <dd>
                      <a
                        href={`mailto:${r.contacts.email}`}
                        className="transition-colors hover:text-primary"
                      >
                        {r.contacts.email}
                      </a>
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 text-sm text-muted-foreground">{r.contacts.person}</p>
              </section>
            </Reveal>
          </article>
        </div>
      </section>

      <section className="section-sm bg-surface">
        <div className="container">
          <Reveal className="mx-auto max-w-3xl">
            <div className="flex flex-col items-start gap-5 rounded-card border border-border bg-card p-7 shadow-card sm:flex-row sm:items-center sm:gap-8">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-gold/10">
                <Music4 className="size-6 text-gold-ink" aria-hidden />
              </span>

              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-semibold">{r.notesCta.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {r.notesCta.body}
                </p>
              </div>

              <Button asChild variant="gold" className="shrink-0">
                <Link href={localizeHref('/notes', locale as Locale)}>
                  {r.notesCta.action}
                  <ArrowRight className="rtl:rotate-180" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

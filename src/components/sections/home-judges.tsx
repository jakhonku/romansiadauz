import { ArrowRight, Users } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { JudgeCard } from '@/components/common/judge-card';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/sections/section-heading';
import { localizeHref, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { cn } from '@/lib/utils/cn';
import type { JudgeSummary } from '@/types/content';

export function HomeJudges({
  locale,
  dictionary,
  items,
}: {
  locale: Locale;
  dictionary: Dictionary;
  items: JudgeSummary[];
}) {
  const j = dictionary.home.judges;

  // A section with nothing to list still shows its heading — a visitor should be able
  // to see that the section exists at all before the first entry does — but it
  // does not get the full-height rhythm of a populated one. At `section` spacing an
  // empty band ran to 760px of near-blank screen; `section-sm` halves that.
  return (
    <section className={cn(items.length ? 'section' : 'section-sm', 'bg-surface')}>
      <div className="container">
        <SectionHeading kicker={j.kicker} title={j.title} subtitle={j.subtitle} />

        {items.length ? (
          <Stagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((judge) => (
              <StaggerItem key={judge.id} className="h-full">
                <JudgeCard
                  judge={judge}
                  locale={locale}
                  chairLabel={dictionary.judges.chairman}
                  className="h-full"
                />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <EmptyState className="mt-10" message={j.empty} icon={Users} />
        )}

        <div className="mt-12 flex justify-center">
          <Button asChild variant="outline" pill className="group">
            <Link href={localizeHref('/judges', locale)}>
              <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                {dictionary.common.viewAll}
              </span>
              <ArrowRight className="transition-transform duration-300 ease-luxe group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

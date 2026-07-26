import { ArrowRight, Newspaper } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { NewsCard } from '@/components/common/news-card';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/sections/section-heading';
import { localizeHref, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { NewsSummary } from '@/types/content';

export function HomeNews({
  locale,
  dictionary,
  items,
}: {
  locale: Locale;
  dictionary: Dictionary;
  items: NewsSummary[];
}) {
  const n = dictionary.home.news;

  return (
    <section className="section bg-surface">
      <div className="container">
        <SectionHeading kicker={n.kicker} title={n.title} subtitle={n.subtitle} />

        {items.length ? (
          <Stagger className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <StaggerItem key={item.id} className="h-full">
                <NewsCard item={item} locale={locale} priority={index === 0} className="h-full" />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <EmptyState className="mt-14" message={n.empty} icon={Newspaper} />
        )}

        <div className="mt-12 flex justify-center">
          <Button asChild variant="outline" pill className="group">
            <Link href={localizeHref('/news', locale)}>
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

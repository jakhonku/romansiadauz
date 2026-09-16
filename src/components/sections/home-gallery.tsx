import { ArrowRight, Images } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/sections/section-heading';
import { localizeHref, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { PhotoSummary } from '@/types/content';
import { cn } from '@/lib/utils/cn';

/**
 * Photo teaser mosaic.
 *
 * The first tile spans two columns and two rows; the rest fill in around it. Doing this
 * with explicit `col-span`/`row-span` on index 0 rather than a masonry library keeps the
 * whole section server-rendered with zero JavaScript — the images are the payload, and
 * a layout engine on top of them would be the largest script on the page.
 */
export function HomeGallery({
  locale,
  dictionary,
  photos,
}: {
  locale: Locale;
  dictionary: Dictionary;
  photos: PhotoSummary[];
}) {
  const g = dictionary.home.gallery;

  // A section with nothing to list still shows its heading — a visitor should be able
  // to see that the section exists at all before the first entry does — but it
  // does not get the full-height rhythm of a populated one. At `section` spacing an
  // empty band ran to 760px of near-blank screen; `section-sm` halves that.
  return (
    <section className={cn(photos.length ? 'section' : 'section-sm', 'bg-background')}>
      <div className="container">
        <SectionHeading kicker={g.kicker} title={g.title} subtitle={g.subtitle} />

        {photos.length ? (
          <Stagger className="mt-14 grid auto-rows-[minmax(0,11rem)] grid-cols-2 gap-4 md:grid-cols-4">
            {photos.map((photo, index) => (
              <StaggerItem
                key={photo.id}
                className={cn(
                  'relative overflow-hidden rounded-media bg-muted',
                  index === 0 && 'col-span-2 row-span-2',
                )}
              >
                <Image
                  src={photo.url}
                  alt={photo.alt}
                  fill
                  sizes={index === 0 ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 768px) 25vw, 50vw'}
                  placeholder={photo.blurDataUrl ? 'blur' : 'empty'}
                  blurDataURL={photo.blurDataUrl ?? undefined}
                  className="object-cover transition-transform duration-700 ease-luxe hover:scale-105"
                />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <EmptyState className="mt-10" message={g.empty} icon={Images} />
        )}

        <div className="mt-12 flex justify-center">
          <Button asChild variant="outline" pill className="group">
            <Link href={localizeHref('/gallery', locale)}>
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

import { Images } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AlbumCard } from '@/components/common/album-card';
import { EmptyState } from '@/components/common/empty-state';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { PageHero } from '@/components/sections/page-hero';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, localizeHref, type Locale } from '@/lib/i18n/config';
import { buildMetadata } from '@/lib/seo/metadata';
import { getAlbums } from '@/server/queries/albums';

export const revalidate = 3600;

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
    path: '/gallery',
    title: d.gallery.title,
    description: d.gallery.subtitle,
  });
}

export default async function GalleryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [d, albums] = await Promise.all([getDictionary(locale), getAlbums(locale)]);

  return (
    <>
      <PageHero
        kicker={d.nav.gallery}
        title={d.gallery.title}
        subtitle={d.gallery.subtitle}
        crumbs={[
          { label: d.nav.home, href: localizeHref('/', locale as Locale) },
          { label: d.nav.photos },
        ]}
      />

      <section className="section bg-background">
        <div className="container">
          {albums.length ? (
            <Stagger className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {albums.map((album) => (
                <StaggerItem key={album.id} className="h-full">
                  <AlbumCard
                    album={album}
                    locale={locale}
                    photosLabel={d.gallery.photos}
                    className="h-full"
                  />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <EmptyState message={d.gallery.empty} icon={Images} />
          )}
        </div>
      </section>
    </>
  );
}

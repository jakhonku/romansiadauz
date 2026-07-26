import { Images } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EmptyState } from '@/components/common/empty-state';
import { PhotoGallery } from '@/components/common/photo-gallery';
import { PageHero } from '@/components/sections/page-hero';
import { siteUrl } from '@/lib/env';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, localizeHref, locales, type Locale } from '@/lib/i18n/config';
import { buildMetadata } from '@/lib/seo/metadata';
import { getAlbumBySlug, getAllAlbumSlugs } from '@/server/queries/albums';

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getAllAlbumSlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const album = await getAlbumBySlug(locale, slug);
  if (!album) return {};

  return buildMetadata({
    locale,
    path: `/gallery/${album.slug}`,
    title: album.title,
    description: album.description ?? '',
    image: album.coverUrl ?? undefined,
  });
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const album = await getAlbumBySlug(locale, slug);
  if (!album) notFound();

  const d = await getDictionary(locale);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name: album.title,
    description: album.description ?? undefined,
    url: `${siteUrl}${localizeHref(`/gallery/${album.slug}`, locale)}`,
    // Capped: a two-hundred-photo album would otherwise emit a JSON-LD block larger
    // than the page it describes.
    image: album.photos.slice(0, 20).map((photo) => photo.url),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHero
        kicker={`${album.photoCount} ${d.gallery.photos}`}
        title={album.title}
        subtitle={album.description ?? undefined}
        crumbs={[
          { label: d.nav.home, href: localizeHref('/', locale as Locale) },
          { label: d.nav.photos, href: localizeHref('/gallery', locale as Locale) },
          { label: album.title },
        ]}
      />

      <section className="section bg-background">
        <div className="container">
          {album.photos.length ? (
            <PhotoGallery photos={album.photos} labels={d.gallery.lightbox} />
          ) : (
            <EmptyState message={d.gallery.empty} icon={Images} />
          )}
        </div>
      </section>
    </>
  );
}

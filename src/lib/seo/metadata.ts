import type { Metadata } from 'next';

import { siteUrl } from '@/lib/env';
import { localeMetadata, locales, localizeHref, type Locale } from '@/lib/i18n/config';

interface BuildMetadataInput {
  locale: Locale;
  /** Locale-free path, e.g. `/news/spring-gala`. */
  path: string;
  title: string;
  description: string;
  /** Site-relative or absolute image URL. Falls back to the generated OG image. */
  image?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  /** Set on admin-adjacent or thin pages that should stay out of the index. */
  noIndex?: boolean;
}

/**
 * Single source of per-page metadata.
 *
 * Every public route funnels through here so canonical URLs, `hreflang` alternates and
 * the OpenGraph block cannot drift apart. `x-default` points at the Uzbek copy, which
 * is the festival's primary language — pointing it at English would be a habit
 * borrowed from products whose main audience is anglophone, and this one's is not.
 */
export function buildMetadata({
  locale,
  path,
  title,
  description,
  image,
  type = 'website',
  publishedTime,
  modifiedTime,
  noIndex = false,
}: BuildMetadataInput): Metadata {
  const canonical = `${siteUrl}${localizeHref(path, locale)}`;

  const languages = Object.fromEntries(
    locales.map((l) => [localeMetadata[l].htmlLang, `${siteUrl}${localizeHref(path, l)}`]),
  );

  const ogImage = image
    ? image.startsWith('http')
      ? image
      : `${siteUrl}${image}`
    : `${siteUrl}/opengraph-image`;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { ...languages, 'x-default': `${siteUrl}${localizeHref(path, 'uz')}` },
    },
    openGraph: {
      type,
      url: canonical,
      title,
      description,
      locale: localeMetadata[locale].ogLocale,
      alternateLocale: locales.filter((l) => l !== locale).map((l) => localeMetadata[l].ogLocale),
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}

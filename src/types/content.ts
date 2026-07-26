/**
 * View models for public content.
 *
 * These are the shapes that cross from `server/queries` into `components/`: one locale
 * already resolved, storage paths already turned into URLs, nothing nullable that a
 * component would have to guess about.
 *
 * They live in `types/` rather than beside the queries so that the boundary rule in
 * ARCHITECTURE §3 — `components/` never imports from `server/` — holds literally, not
 * just at runtime.
 */

export interface NewsSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  publishedAt: string | null;
  isFeatured: boolean;
}

export interface JudgeSummary {
  id: string;
  slug: string;
  fullName: string;
  roleTitle: string | null;
  photoUrl: string | null;
  countryCode: string | null;
  isChair: boolean;
}

export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
}

export interface PhotoSummary {
  id: string;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
}

export interface NewsArticle extends NewsSummary {
  /** Sanitised HTML from the rich-text editor. */
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  categorySlug: string | null;
}

export interface AlbumSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  eventDate: string | null;
  photoCount: number;
}

export interface VideoSummary {
  id: string;
  youtubeId: string;
  title: string;
  description: string | null;
  categorySlug: string | null;
  durationSeconds: number | null;
  publishedAt: string | null;
}

export interface WinnerSummary {
  id: string;
  fullName: string;
  awardTitle: string | null;
  year: number;
  place: number | null;
  isGrandPrix: boolean;
  photoUrl: string | null;
  countryCode: string | null;
}

export interface StaticPage {
  slug: string;
  title: string;
  /** Sanitised HTML. */
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
}

/** A `{ slug, label }` pair for the category filter chips above a list. */
export interface CategoryOption {
  slug: string;
  label: string;
}

export interface PartnerSummary {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  /** Separate asset for dark mode; partner logos are usually dark-on-transparent. */
  logoDarkUrl: string | null;
  websiteUrl: string | null;
  tier: number;
}

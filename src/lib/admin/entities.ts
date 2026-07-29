import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { TranslationTable } from '@/server/actions/translation-sync';

/**
 * Descriptor-driven admin modules.
 *
 * Six of the editorial entities have the same shape: a handful of scalar columns, a
 * per-locale translation table, a publication status and a sort order. Writing six
 * bespoke list pages and six bespoke forms would be six places to fix the next bug
 * in translation pruning or status handling.
 *
 * So they are described here and rendered by one generic list and one generic form.
 * News is deliberately *not* in this registry: it carries a rich-text body, scheduled
 * publishing and SEO fields, and bending the generic form far enough to cover it would
 * make the abstraction cost more than it saves.
 *
 * The registry is also the whitelist for `/admin/[entity]` — a key that is not here 404s.
 * Removing an entry removes the module, which is how `pages` was retired: the site has
 * no free-form editorial pages, so a screen for authoring them was a menu entry that
 * only ever led to an empty list.
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'checkbox'
  | 'date'
  | 'datetime'
  /** A `*_path` column, edited through the uploader. Stored as a plain string. */
  | 'image';

/*
 * There is no `richtext` field type. `pages` was the only descriptor that used one, and
 * with it gone the generic form no longer has to carry Tiptap — which is most of its
 * JavaScript. The article editor keeps its own rich text; it was never rendered by this
 * registry. Reintroducing the type means adding the branch back to `entity-form.tsx`,
 * and accepting the bundle it drags with it.
 */

export interface FieldDef {
  /** Database column name. */
  name: string;
  label: (d: Dictionary) => string;
  type: FieldType;
  hint?: (d: Dictionary) => string;
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
}

export interface EntityConfig {
  /** URL segment: `/admin/<key>`. */
  key: string;
  table: 'judges' | 'winners' | 'partners' | 'events' | 'videos' | 'albums';
  translationTable: TranslationTable;
  foreignKey: string;

  title: (d: Dictionary) => string;
  newLabel: (d: Dictionary) => string;
  editLabel: (d: Dictionary) => string;
  emptyLabel: (d: Dictionary) => string;

  /** Does the table have a `slug` column? Winners and videos do not. */
  hasSlug: boolean;
  hasStatus: boolean;
  hasSortOrder: boolean;

  /** Translation column used as the record's name in lists. */
  titleColumn: string;

  baseFields: FieldDef[];
  translationFields: FieldDef[];

  /** Extra columns shown in the list, after the title. */
  listColumns?: { label: (d: Dictionary) => string; column: string }[];

  /** Default ordering for the list. */
  orderBy: { column: string; ascending: boolean }[];
}

export const ENTITIES: Record<string, EntityConfig> = {
  judges: {
    key: 'judges',
    table: 'judges',
    translationTable: 'judge_translations',
    foreignKey: 'judge_id',
    title: (d) => d.admin.judges.title,
    newLabel: (d) => d.admin.judges.newItem,
    editLabel: (d) => d.admin.judges.editItem,
    emptyLabel: (d) => d.admin.judges.empty,
    hasSlug: true,
    hasStatus: true,
    hasSortOrder: true,
    titleColumn: 'full_name',
    baseFields: [
      { name: 'photo_path', label: (d) => d.admin.judges.photo, type: 'image' },
      { name: 'country_code', label: (d) => d.admin.judges.country, type: 'text', max: 2 },
      { name: 'is_chair', label: (d) => d.admin.judges.isChair, type: 'checkbox' },
    ],
    translationFields: [
      { name: 'full_name', label: (d) => d.admin.judges.fullName, type: 'text', required: true },
      { name: 'role_title', label: (d) => d.admin.judges.roleTitle, type: 'text' },
      { name: 'biography', label: (d) => d.admin.judges.biography, type: 'textarea' },
      { name: 'achievements', label: (d) => d.admin.judges.achievements, type: 'textarea' },
    ],
    orderBy: [
      { column: 'is_chair', ascending: false },
      { column: 'sort_order', ascending: true },
    ],
  },

  winners: {
    key: 'winners',
    table: 'winners',
    translationTable: 'winner_translations',
    foreignKey: 'winner_id',
    title: (d) => d.admin.winners.title,
    newLabel: (d) => d.admin.winners.newItem,
    editLabel: (d) => d.admin.winners.editItem,
    emptyLabel: (d) => d.admin.winners.empty,
    hasSlug: false,
    hasStatus: true,
    hasSortOrder: true,
    titleColumn: 'full_name',
    baseFields: [
      { name: 'year', label: (d) => d.admin.winners.year, type: 'number', required: true, min: 1990, max: 2200 },
      { name: 'place', label: (d) => d.admin.winners.place, type: 'number', min: 1, max: 10 },
      { name: 'is_grand_prix', label: (d) => d.admin.winners.isGrandPrix, type: 'checkbox' },
      { name: 'photo_path', label: (d) => d.admin.winners.photo, type: 'image' },
      { name: 'country_code', label: (d) => d.admin.winners.country, type: 'text', max: 2 },
    ],
    translationFields: [
      { name: 'full_name', label: (d) => d.admin.winners.fullName, type: 'text', required: true },
      { name: 'award_title', label: (d) => d.admin.winners.awardTitle, type: 'text' },
      { name: 'biography', label: (d) => d.admin.winners.biography, type: 'textarea' },
    ],
    listColumns: [{ label: (d) => d.admin.winners.year, column: 'year' }],
    orderBy: [
      { column: 'year', ascending: false },
      { column: 'sort_order', ascending: true },
    ],
  },

  partners: {
    key: 'partners',
    table: 'partners',
    translationTable: 'partner_translations',
    foreignKey: 'partner_id',
    title: (d) => d.admin.partners.title,
    newLabel: (d) => d.admin.partners.newItem,
    editLabel: (d) => d.admin.partners.editItem,
    emptyLabel: (d) => d.admin.partners.empty,
    hasSlug: true,
    hasStatus: true,
    hasSortOrder: true,
    titleColumn: 'name',
    baseFields: [
      { name: 'logo_path', label: (d) => d.admin.partners.logo, type: 'image' },
      { name: 'logo_dark_path', label: (d) => d.admin.partners.logoDark, type: 'image' },
      { name: 'website_url', label: (d) => d.admin.partners.website, type: 'text', placeholder: 'https://' },
      { name: 'tier', label: (d) => d.admin.partners.tier, type: 'number', min: 1, max: 5 },
    ],
    translationFields: [
      { name: 'name', label: (d) => d.admin.partners.name, type: 'text', required: true },
      { name: 'description', label: (d) => d.admin.partners.description, type: 'textarea' },
    ],
    orderBy: [
      { column: 'tier', ascending: true },
      { column: 'sort_order', ascending: true },
    ],
  },

  events: {
    key: 'events',
    table: 'events',
    translationTable: 'event_translations',
    foreignKey: 'event_id',
    title: (d) => d.admin.events.title,
    newLabel: (d) => d.admin.events.newItem,
    editLabel: (d) => d.admin.events.editItem,
    emptyLabel: (d) => d.admin.events.empty,
    hasSlug: true,
    hasStatus: true,
    hasSortOrder: true,
    titleColumn: 'title',
    baseFields: [
      { name: 'starts_at', label: (d) => d.admin.events.startsAt, type: 'datetime', required: true },
      { name: 'ends_at', label: (d) => d.admin.events.endsAt, type: 'datetime' },
      { name: 'cover_path', label: (d) => d.admin.common.coverImage, type: 'image' },
    ],
    translationFields: [
      { name: 'title', label: (d) => d.admin.events.eventTitle, type: 'text', required: true },
      { name: 'description', label: (d) => d.admin.events.description, type: 'textarea' },
      { name: 'location', label: (d) => d.admin.events.location, type: 'text' },
    ],
    listColumns: [{ label: (d) => d.admin.events.startsAt, column: 'starts_at' }],
    orderBy: [{ column: 'starts_at', ascending: false }],
  },

  videos: {
    key: 'videos',
    table: 'videos',
    translationTable: 'video_translations',
    foreignKey: 'video_id',
    title: (d) => d.admin.videos.title,
    newLabel: (d) => d.admin.videos.newItem,
    editLabel: (d) => d.admin.videos.editItem,
    emptyLabel: (d) => d.admin.videos.empty,
    hasSlug: false,
    hasStatus: true,
    hasSortOrder: true,
    titleColumn: 'title',
    baseFields: [
      {
        name: 'youtube_id',
        label: (d) => d.admin.videos.youtubeId,
        type: 'text',
        required: true,
        hint: (d) => d.admin.videos.youtubeHint,
        placeholder: 'dQw4w9WgXcQ',
      },
      { name: 'duration_seconds', label: (d) => d.admin.videos.duration, type: 'number', min: 0 },
      { name: 'published_at', label: (d) => d.admin.news.publishedAt, type: 'datetime' },
      { name: 'is_featured', label: (d) => d.admin.common.featured, type: 'checkbox' },
    ],
    translationFields: [
      { name: 'title', label: (d) => d.admin.videos.videoTitle, type: 'text', required: true },
      { name: 'description', label: (d) => d.admin.videos.description, type: 'textarea' },
    ],
    orderBy: [
      { column: 'published_at', ascending: false },
      { column: 'sort_order', ascending: true },
    ],
  },

  gallery: {
    key: 'gallery',
    table: 'albums',
    translationTable: 'album_translations',
    foreignKey: 'album_id',
    title: (d) => d.admin.gallery.title,
    newLabel: (d) => d.admin.gallery.newItem,
    editLabel: (d) => d.admin.gallery.editItem,
    emptyLabel: (d) => d.admin.gallery.empty,
    hasSlug: true,
    hasStatus: true,
    hasSortOrder: true,
    titleColumn: 'title',
    baseFields: [
      { name: 'cover_path', label: (d) => d.admin.common.coverImage, type: 'image' },
      { name: 'event_date', label: (d) => d.admin.gallery.eventDate, type: 'date' },
    ],
    translationFields: [
      { name: 'title', label: (d) => d.admin.gallery.albumTitle, type: 'text', required: true },
      { name: 'description', label: (d) => d.admin.gallery.description, type: 'textarea' },
    ],
    listColumns: [{ label: (d) => d.admin.gallery.eventDate, column: 'event_date' }],
    orderBy: [
      { column: 'event_date', ascending: false },
      { column: 'sort_order', ascending: true },
    ],
  },
};

export function getEntity(key: string): EntityConfig | null {
  return Object.prototype.hasOwnProperty.call(ENTITIES, key) ? ENTITIES[key]! : null;
}

/** A descriptor with every label already resolved — plain data, safe to hand to a Client Component. */
export interface ResolvedField {
  name: string;
  label: string;
  type: FieldType;
  hint?: string;
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
}

export interface ResolvedEntityConfig {
  key: string;
  title: string;
  newLabel: string;
  editLabel: string;
  emptyLabel: string;
  hasSlug: boolean;
  hasStatus: boolean;
  hasSortOrder: boolean;
  titleColumn: string;
  baseFields: ResolvedField[];
  translationFields: ResolvedField[];
}

function resolveField(field: FieldDef, d: Dictionary): ResolvedField {
  return {
    name: field.name,
    label: field.label(d),
    type: field.type,
    ...(field.hint ? { hint: field.hint(d) } : {}),
    ...(field.required ? { required: true } : {}),
    ...(field.min !== undefined ? { min: field.min } : {}),
    ...(field.max !== undefined ? { max: field.max } : {}),
    ...(field.placeholder ? { placeholder: field.placeholder } : {}),
  };
}

/**
 * The label resolvers above are functions, which cannot cross the server/client
 * boundary. This flattens a descriptor into serialisable data on the server so the
 * generic form receives plain strings.
 */
export function resolveEntityConfig(config: EntityConfig, d: Dictionary): ResolvedEntityConfig {
  return {
    key: config.key,
    title: config.title(d),
    newLabel: config.newLabel(d),
    editLabel: config.editLabel(d),
    emptyLabel: config.emptyLabel(d),
    hasSlug: config.hasSlug,
    hasStatus: config.hasStatus,
    hasSortOrder: config.hasSortOrder,
    titleColumn: config.titleColumn,
    baseFields: config.baseFields.map((f) => resolveField(f, d)),
    translationFields: config.translationFields.map((f) => resolveField(f, d)),
  };
}

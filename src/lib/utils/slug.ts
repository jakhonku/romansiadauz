import slugify from 'slugify';

/**
 * URL slug from a title.
 *
 * `locale: 'ru'` gives slugify its Cyrillic transliteration table, so a Russian
 * headline becomes `vesenniy-gala-koncert` rather than an empty string. Uzbek Latin
 * needs no transliteration and passes through unchanged; the apostrophes in `o'` and
 * `g'` are stripped by `remove`.
 */
export function toSlug(input: string): string {
  return slugify(input, {
    lower: true,
    strict: true,
    locale: 'ru',
    remove: /["'’‘“”«»]/g,
  }).slice(0, 80);
}

/**
 * Slug for a record, falling back to a timestamp suffix.
 *
 * A title made entirely of characters slugify drops — punctuation, an emoji, a script
 * with no transliteration table — would otherwise yield `''`, and an empty slug
 * collides with every other empty slug on the UNIQUE index. The suffix keeps the row
 * saveable; an editor can always set a readable slug by hand afterwards.
 */
export function toSlugOrFallback(input: string, prefix = 'item'): string {
  const slug = toSlug(input);
  return slug || `${prefix}-${Date.now().toString(36)}`;
}

import { z } from 'zod';

import { locales } from '@/lib/i18n/config';

/**
 * Article editor.
 *
 * Translations are validated as a record keyed by locale. Only the default locale is
 * required — insisting on all three would stop an editor publishing breaking news in
 * Uzbek at 9pm because nobody has translated it into English yet. The public site
 * already degrades through the fallback chain (ARCHITECTURE §4) when a translation is
 * missing.
 */
const translationSchema = z.object({
  title: z.string().trim().max(200),
  excerpt: z.string().trim().max(500).optional().or(z.literal('')),
  body: z.string().max(200_000).optional().or(z.literal('')),
  seoTitle: z.string().trim().max(200).optional().or(z.literal('')),
  seoDescription: z.string().trim().max(300).optional().or(z.literal('')),
});

export type NewsTranslationInput = z.infer<typeof translationSchema>;

export const newsSchema = z
  .object({
    id: z.string().uuid().optional(),
    slug: z
      .string()
      .trim()
      .max(80)
      .regex(/^[a-z0-9-]*$/, 'slug_format')
      .optional()
      .or(z.literal('')),
    categoryId: z.string().uuid().optional().or(z.literal('')),
    coverPath: z.string().max(400).optional().or(z.literal('')),
    status: z.enum(['draft', 'published', 'archived']),
    publishedAt: z.string().optional().or(z.literal('')),
    isFeatured: z.boolean().default(false),
    translations: z.record(z.enum(locales), translationSchema),
  })
  .superRefine((value, ctx) => {
    // The Uzbek title is the record's name everywhere in the admin UI — a row without
    // one shows as a blank line in every list.
    if (!value.translations.uz?.title?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['translations', 'uz', 'title'],
        message: 'required',
      });
    }

    // Mirrors the `news_published_has_date` CHECK in 0003. Catching it here produces a
    // field error instead of a raw Postgres constraint violation.
    if (value.status === 'published' && !value.publishedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['publishedAt'],
        message: 'required',
      });
    }
  });

export type NewsInput = z.infer<typeof newsSchema>;

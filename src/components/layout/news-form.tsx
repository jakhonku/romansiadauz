'use client';

import { Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { ImageUpload } from '@/components/common/image-upload';
import { RichTextEditor, type EditorLabels } from '@/components/common/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { mediaLabels } from '@/lib/admin/media-labels';
import { localeMetadata, locales, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { cn } from '@/lib/utils/cn';
import { deleteNews, saveNews } from '@/server/actions/admin-news';
import type { ContentStatus, LocaleCode } from '@/types/database.types';

type Translation = {
  title: string;
  excerpt: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
};

export interface NewsFormValue {
  id?: string;
  slug: string;
  categoryId: string;
  coverPath: string;
  status: ContentStatus;
  publishedAt: string;
  isFeatured: boolean;
  translations: Record<LocaleCode, Translation>;
}

/** `datetime-local` wants `YYYY-MM-DDTHH:mm`; Postgres hands back a full ISO string. */
function toLocalInput(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/**
 * Article editor.
 *
 * Translations live behind locale tabs but are all held in one state object and saved
 * in one action — an editor writing the Uzbek and Russian versions in one sitting
 * should press Save once, not once per language.
 *
 * Every tab stays mounted (hidden with the `hidden` *class*, never the `hidden`
 * attribute — see the note in `registration-form.tsx`) so Tiptap instances are not torn
 * down and rebuilt, which would lose undo history on every tab switch.
 */
export function NewsForm({
  initial,
  categories,
  dictionary,
}: {
  initial: NewsFormValue;
  categories: { id: string; label: string }[];
  dictionary: Dictionary;
}) {
  const router = useRouter();
  const d = dictionary;
  const n = d.admin.news;
  const c = d.admin.common;

  const [value, setValue] = useState<NewsFormValue>({
    ...initial,
    publishedAt: toLocalInput(initial.publishedAt),
  });
  const [tab, setTab] = useState<Locale>('uz');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editorLabels: EditorLabels = {
    bold: d.admin.editor.bold,
    italic: d.admin.editor.italic,
    heading2: d.admin.editor.heading2,
    heading3: d.admin.editor.heading3,
    bulletList: d.admin.editor.bulletList,
    orderedList: d.admin.editor.orderedList,
    quote: d.admin.editor.quote,
    link: d.admin.editor.link,
    unlink: d.admin.editor.unlink,
    linkPrompt: d.admin.editor.linkPrompt,
    undo: d.admin.editor.undo,
    redo: d.admin.editor.redo,
  };

  function patchTranslation(locale: LocaleCode, patch: Partial<Translation>) {
    setValue((previous) => ({
      ...previous,
      translations: {
        ...previous.translations,
        [locale]: { ...previous.translations[locale], ...patch },
      },
    }));
  }

  function submit() {
    setError(null);

    startTransition(async () => {
      const result = await saveNews({
        id: value.id,
        slug: value.slug,
        categoryId: value.categoryId,
        coverPath: value.coverPath,
        status: value.status,
        // Back to ISO with the browser's offset, so a date typed as 18:00 in Tashkent
        // is stored as 18:00 in Tashkent.
        publishedAt: value.publishedAt ? new Date(value.publishedAt).toISOString() : '',
        isFeatured: value.isFeatured,
        translations: value.translations,
      });

      if (result.ok) {
        router.push('/admin/news');
        router.refresh();
        return;
      }

      setError(
        result.reason === 'duplicate_slug'
          ? n.duplicateSlug
          : result.reason === 'invalid'
            ? n.translationsHint
            : c.saveFailed,
      );
    });
  }

  function remove() {
    if (!value.id) return;
    if (!window.confirm(`${c.confirmDelete}\n\n${c.confirmDeleteBody}`)) return;

    startTransition(async () => {
      const result = await deleteNews(value.id!, value.slug);
      if (result.ok) {
        router.push('/admin/news');
        router.refresh();
      } else {
        setError(c.saveFailed);
      }
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-6"
    >
      <section className="rounded-card border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold">{c.translations}</h2>
        <p className="mt-1.5 text-xs text-muted-foreground">{n.translationsHint}</p>

        <div role="tablist" aria-label={c.translations} className="mt-5 flex gap-1">
          {locales.map((locale) => {
            const filled = Boolean(value.translations[locale]?.title?.trim());
            return (
              <button
                key={locale}
                type="button"
                role="tab"
                aria-selected={tab === locale}
                onClick={() => setTab(locale)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
                  tab === locale
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {localeMetadata[locale].label}
                {/* A filled dot means this language has a title, so an editor can see
                    translation coverage without opening each tab. */}
                <span
                  aria-hidden
                  className={cn(
                    'size-1.5 rounded-full',
                    filled ? 'bg-success' : 'bg-current opacity-30',
                  )}
                />
              </button>
            );
          })}
        </div>

        {locales.map((locale) => (
          <div
            key={locale}
            role="tabpanel"
            className={cn('mt-6 flex-col gap-5', tab === locale ? 'flex' : 'hidden')}
          >
            <Field
              id={`title-${locale}`}
              label={c.title}
              required={locale === 'uz'}
              optionalLabel={locale === 'uz' ? undefined : d.common.optional}
            >
              {(props) => (
                <Input
                  {...props}
                  value={value.translations[locale].title}
                  onChange={(event) => patchTranslation(locale, { title: event.target.value })}
                />
              )}
            </Field>

            <Field id={`excerpt-${locale}`} label={n.excerpt} optionalLabel={d.common.optional}>
              {(props) => (
                <Textarea
                  {...props}
                  rows={2}
                  value={value.translations[locale].excerpt}
                  onChange={(event) => patchTranslation(locale, { excerpt: event.target.value })}
                />
              )}
            </Field>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor={`body-${locale}`}>
                {n.body}
              </label>
              <div id={`body-${locale}`}>
                <RichTextEditor
                  value={value.translations[locale].body}
                  onChange={(html) => patchTranslation(locale, { body: html })}
                  placeholder={d.admin.editor.bodyPlaceholder}
                  labels={editorLabels}
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                id={`seo-title-${locale}`}
                label={c.seoTitle}
                optionalLabel={d.common.optional}
              >
                {(props) => (
                  <Input
                    {...props}
                    value={value.translations[locale].seoTitle}
                    onChange={(event) => patchTranslation(locale, { seoTitle: event.target.value })}
                  />
                )}
              </Field>
              <Field
                id={`seo-description-${locale}`}
                label={c.seoDescription}
                optionalLabel={d.common.optional}
              >
                {(props) => (
                  <Input
                    {...props}
                    value={value.translations[locale].seoDescription}
                    onChange={(event) =>
                      patchTranslation(locale, { seoDescription: event.target.value })
                    }
                  />
                )}
              </Field>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-card border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold">{c.status}</h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field id="news-status" label={c.status} required>
            {(props) => (
              <Select
                {...props}
                value={value.status}
                onChange={(event) =>
                  setValue((p) => ({ ...p, status: event.target.value as ContentStatus }))
                }
              >
                <option value="draft">{c.draft}</option>
                <option value="published">{c.published}</option>
                <option value="archived">{c.archived}</option>
              </Select>
            )}
          </Field>

          <Field
            id="news-published-at"
            label={n.publishedAt}
            required={value.status === 'published'}
          >
            {(props) => (
              <Input
                {...props}
                type="datetime-local"
                value={value.publishedAt}
                onChange={(event) => setValue((p) => ({ ...p, publishedAt: event.target.value }))}
              />
            )}
          </Field>

          <Field id="news-slug" label={c.slug} hint={n.slugHint} optionalLabel={d.common.optional}>
            {(props) => (
              <Input
                {...props}
                value={value.slug}
                onChange={(event) => setValue((p) => ({ ...p, slug: event.target.value }))}
                placeholder="spring-gala-2026"
              />
            )}
          </Field>

          <Field id="news-category" label={c.category} optionalLabel={d.common.optional}>
            {(props) => (
              <Select
                {...props}
                value={value.categoryId}
                onChange={(event) => setValue((p) => ({ ...p, categoryId: event.target.value }))}
              >
                <option value="">{d.registration.placeholders.select}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <ImageUpload
            id="news-cover"
            label={c.coverImage}
            value={value.coverPath}
            onChange={(path) => setValue((p) => ({ ...p, coverPath: path }))}
            folder="news"
            labels={mediaLabels(d)}
            hint={n.coverHint}
            optionalLabel={d.common.optional}
            placeholder="news/spring-gala-a1b2c3.jpg"
            className="sm:col-span-2"
          />
        </div>

        <label className="mt-5 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={value.isFeatured}
            onChange={(event) => setValue((p) => ({ ...p, isFeatured: event.target.checked }))}
            className="size-4 accent-[hsl(var(--primary))]"
          />
          <span className="text-sm">{c.featured}</span>
        </label>
      </section>

      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          <Save />
          {pending ? d.admin.registrations.saving : d.common.save}
        </Button>

        {value.id ? (
          <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
            <Trash2 />
            {c.delete}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

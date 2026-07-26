'use client';

import { Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { RichTextEditor, type EditorLabels } from '@/components/common/rich-text-editor';
import { TranslationTabs, panelClass } from '@/components/layout/translation-tabs';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import type { ResolvedEntityConfig, ResolvedField } from '@/lib/admin/entities';
import { locales, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { deleteEntity, saveEntity } from '@/server/actions/admin-entity';
import type { ContentStatus, LocaleCode } from '@/types/database.types';

export interface EntityFormValue {
  id: string;
  slug: string;
  status: ContentStatus;
  sortOrder: number;
  base: Record<string, string | boolean>;
  translations: Record<LocaleCode, Record<string, string>>;
}

/** `datetime-local` wants `YYYY-MM-DDTHH:mm`; Postgres returns a full ISO string. */
function toLocalInput(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/**
 * One form for every descriptor-driven module.
 *
 * Renders base fields, then the translation fields behind locale tabs. All three
 * locales are held in one state object and saved in one action — an editor filling in
 * Uzbek and Russian in one sitting presses Save once.
 *
 * Tab panels stay mounted and are hidden with the `hidden` *class* rather than the
 * `hidden` attribute; Tailwind's `flex` overrides the attribute, and rich-text editors
 * inside a torn-down panel would lose their undo history.
 */
export function EntityForm({
  config,
  initial,
  dictionary,
}: {
  config: ResolvedEntityConfig;
  initial: EntityFormValue;
  dictionary: Dictionary;
}) {
  const router = useRouter();
  const d = dictionary;
  const c = d.admin.common;

  const [value, setValue] = useState<EntityFormValue>(() => ({
    ...initial,
    base: Object.fromEntries(
      config.baseFields.map((field) => {
        const raw = initial.base[field.name];
        return [
          field.name,
          field.type === 'datetime' ? toLocalInput(String(raw ?? '')) : (raw ?? ''),
        ];
      }),
    ),
  }));
  const [tab, setTab] = useState<Locale>('uz');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const requiredField = config.translationFields.find((f) => f.required);

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

  function patchBase(name: string, next: string | boolean) {
    setValue((previous) => ({ ...previous, base: { ...previous.base, [name]: next } }));
  }

  function patchTranslation(locale: LocaleCode, name: string, next: string) {
    setValue((previous) => ({
      ...previous,
      translations: {
        ...previous.translations,
        [locale]: { ...previous.translations[locale], [name]: next },
      },
    }));
  }

  function submit() {
    setError(null);

    startTransition(async () => {
      const result = await saveEntity({
        entityKey: config.key,
        id: value.id || undefined,
        slug: value.slug,
        status: value.status,
        sortOrder: value.sortOrder,
        base: value.base,
        translations: value.translations,
      });

      if (result.ok) {
        router.push(`/admin/${config.key}`);
        router.refresh();
        return;
      }

      setError(
        result.reason === 'duplicate_slug'
          ? d.admin.news.duplicateSlug
          : result.reason === 'invalid'
            ? d.validation.required
            : c.saveFailed,
      );
    });
  }

  function remove() {
    if (!value.id) return;
    if (!window.confirm(`${c.confirmDelete}\n\n${c.confirmDeleteBody}`)) return;

    startTransition(async () => {
      const result = await deleteEntity(config.key, value.id, value.slug);
      if (result.ok) {
        router.push(`/admin/${config.key}`);
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

        <TranslationTabs
          className="mt-5"
          active={tab}
          onChange={setTab}
          filled={(locale) =>
            Boolean(requiredField && value.translations[locale]?.[requiredField.name]?.trim())
          }
          label={c.translations}
        />

        {locales.map((locale) => (
          <div key={locale} role="tabpanel" className={panelClass(tab === locale)}>
            {config.translationFields.map((field) => (
              <TranslationField
                key={field.name}
                field={field}
                locale={locale}
                value={value.translations[locale][field.name] ?? ''}
                onChange={(next) => patchTranslation(locale, field.name, next)}
                optionalLabel={d.common.optional}
                editorLabels={editorLabels}
                editorPlaceholder={d.admin.editor.bodyPlaceholder}
              />
            ))}
          </div>
        ))}
      </section>

      <section className="rounded-card border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold">{c.status}</h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {config.hasStatus ? (
            <Field id={`${config.key}-status`} label={c.status} required>
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
          ) : null}

          {config.hasSortOrder ? (
            <Field id={`${config.key}-sort`} label={c.sortOrder} optionalLabel={d.common.optional}>
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  value={value.sortOrder}
                  onChange={(event) =>
                    setValue((p) => ({ ...p, sortOrder: Number(event.target.value) || 0 }))
                  }
                />
              )}
            </Field>
          ) : null}

          {config.hasSlug ? (
            <Field
              id={`${config.key}-slug`}
              label={c.slug}
              hint={d.admin.news.slugHint}
              optionalLabel={d.common.optional}
            >
              {(props) => (
                <Input
                  {...props}
                  value={value.slug}
                  onChange={(event) => setValue((p) => ({ ...p, slug: event.target.value }))}
                />
              )}
            </Field>
          ) : null}

          {config.baseFields.map((field) => (
            <BaseField
              key={field.name}
              field={field}
              value={value.base[field.name] ?? ''}
              onChange={(next) => patchBase(field.name, next)}
              optionalLabel={d.common.optional}
              entityKey={config.key}
            />
          ))}
        </div>
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

function TranslationField({
  field,
  locale,
  value,
  onChange,
  optionalLabel,
  editorLabels,
  editorPlaceholder,
}: {
  field: ResolvedField;
  locale: Locale;
  value: string;
  onChange: (next: string) => void;
  optionalLabel: string;
  editorLabels: EditorLabels;
  editorPlaceholder: string;
}) {
  const id = `${field.name}-${locale}`;

  if (field.type === 'richtext') {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor={id}>
          {field.label}
        </label>
        <div id={id}>
          <RichTextEditor
            value={value}
            onChange={onChange}
            placeholder={editorPlaceholder}
            labels={editorLabels}
          />
        </div>
      </div>
    );
  }

  return (
    <Field
      id={id}
      label={field.label}
      hint={field.hint}
      // Only the default locale's required field is genuinely required — the others
      // are how an editor leaves a language untranslated for now.
      required={field.required && locale === 'uz'}
      optionalLabel={field.required && locale === 'uz' ? undefined : optionalLabel}
    >
      {(props) =>
        field.type === 'textarea' ? (
          <Textarea {...props} rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <Input {...props} value={value} onChange={(e) => onChange(e.target.value)} />
        )
      }
    </Field>
  );
}

function BaseField({
  field,
  value,
  onChange,
  optionalLabel,
  entityKey,
}: {
  field: ResolvedField;
  value: string | boolean;
  onChange: (next: string | boolean) => void;
  optionalLabel: string;
  entityKey: string;
}) {
  const id = `${entityKey}-${field.name}`;

  if (field.type === 'checkbox') {
    return (
      <label className="flex cursor-pointer items-start gap-3 sm:col-span-2">
        <input
          type="checkbox"
          id={id}
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-[hsl(var(--primary))]"
        />
        <span>
          <span className="text-sm">{field.label}</span>
          {field.hint ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">{field.hint}</span>
          ) : null}
        </span>
      </label>
    );
  }

  const inputType =
    field.type === 'number'
      ? 'number'
      : field.type === 'date'
        ? 'date'
        : field.type === 'datetime'
          ? 'datetime-local'
          : 'text';

  return (
    <Field
      id={id}
      label={field.label}
      hint={field.hint}
      required={field.required}
      optionalLabel={field.required ? undefined : optionalLabel}
      className={field.type === 'textarea' ? 'sm:col-span-2' : undefined}
    >
      {(props) =>
        field.type === 'textarea' ? (
          <Textarea
            {...props}
            rows={3}
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <Input
            {...props}
            type={inputType}
            min={field.min}
            max={field.max}
            placeholder={field.placeholder}
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      }
    </Field>
  );
}

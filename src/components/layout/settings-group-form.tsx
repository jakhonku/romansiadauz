'use client';

import { CheckCircle2, Save } from 'lucide-react';
import { useState, useTransition } from 'react';

import { ImageUpload } from '@/components/common/image-upload';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import type { MediaLabels } from '@/lib/admin/media-labels';
import { saveSettingsGroup } from '@/server/actions/admin-settings';

export interface SettingsFieldDef {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'url' | 'email' | 'datetime-local' | 'image';
  placeholder?: string;
}

/**
 * One card per settings group, saved independently.
 *
 * Independent saves rather than one page-wide submit: the groups are unrelated, and an
 * administrator who fixes a phone number should not have to re-confirm the analytics
 * IDs to do it — nor risk overwriting a colleague's concurrent change to a group they
 * never touched.
 */
export function SettingsGroupForm({
  group,
  title,
  description,
  fields,
  initial,
  labels,
  media,
}: {
  group: string;
  title: string;
  description?: string;
  fields: SettingsFieldDef[];
  initial: Record<string, unknown>;
  labels: { save: string; saving: string; saved: string; failed: string };
  /** Required only by groups that carry an `image` field — branding, today. */
  media?: MediaLabels;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((field) => [
        field.name,
        initial[field.name] == null ? '' : String(initial[field.name]),
      ]),
    ),
  );
  const [status, setStatus] = useState<'idle' | 'saved' | 'failed'>('idle');
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setStatus('idle');

        const payload: Record<string, unknown> = {};
        for (const field of fields) {
          const raw = values[field.name] ?? '';
          if (field.type === 'number') {
            const parsed = Number(raw);
            // An empty or unparseable number is stored as null, not 0 — "no value" and
            // "zero" mean different things on a statistics tile.
            payload[field.name] = raw.trim() && Number.isFinite(parsed) ? parsed : null;
          } else {
            payload[field.name] = raw.trim() || null;
          }
        }

        startTransition(async () => {
          const result = await saveSettingsGroup(group, payload);
          setStatus(result.ok ? 'saved' : 'failed');
        });
      }}
      className="rounded-card border border-border bg-card p-6 shadow-card"
    >
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {description ? <p className="mt-1.5 text-sm text-muted-foreground">{description}</p> : null}

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {fields.map((field) =>
          field.type === 'image' && media ? (
            <ImageUpload
              key={field.name}
              id={`${group}-${field.name}`}
              label={field.label}
              value={values[field.name] ?? ''}
              onChange={(path) => setValues((previous) => ({ ...previous, [field.name]: path }))}
              folder="branding"
              labels={media}
              placeholder={field.placeholder}
              className="sm:col-span-2"
            />
          ) : (
            <Field key={field.name} id={`${group}-${field.name}`} label={field.label}>
              {(props) => (
                <Input
                  {...props}
                  type={
                    field.type === 'number'
                      ? 'number'
                      : field.type === 'email'
                        ? 'email'
                        : field.type === 'datetime-local'
                          ? 'datetime-local'
                          : 'text'
                  }
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ''}
                  onChange={(event) =>
                    setValues((previous) => ({ ...previous, [field.name]: event.target.value }))
                  }
                />
              )}
            </Field>
          ),
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          <Save />
          {pending ? labels.saving : labels.save}
        </Button>

        {status === 'saved' ? (
          <span role="status" className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="size-4" />
            {labels.saved}
          </span>
        ) : null}
        {status === 'failed' ? (
          <span role="alert" className="text-sm font-medium text-destructive">
            {labels.failed}
          </span>
        ) : null}
      </div>
    </form>
  );
}

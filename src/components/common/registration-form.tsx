'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, CheckCircle2, Send } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Controller, useForm, type FieldPath } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { interpolate } from '@/lib/i18n/format';
import { localizeHref, type Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { cn } from '@/lib/utils/cn';
import { MIN_AGE, registrationSchema, type RegistrationInput } from '@/lib/validation/registration';
import { submitRegistration } from '@/server/actions/registration';

interface NominationOption {
  id: string;
  name: string;
}

/**
 * The five steps, and which fields each one owns.
 *
 * The array drives both the progress indicator and `trigger()`: "Next" validates only
 * the current step's fields, so a visitor is never blocked by an error on a step they
 * have not reached. The final submit still validates the whole schema.
 */
const STEPS = [
  {
    key: 'personal',
    fields: ['firstName', 'lastName', 'middleName', 'birthDate'],
  },
  {
    key: 'education',
    fields: ['institution', 'faculty', 'position'],
  },
  {
    key: 'contact',
    fields: ['address', 'email', 'phone'],
  },
  {
    key: 'programme',
    fields: [
      'nominationId',
      'programmeRound1',
      'programmeRound2',
      'programmeRound3',
      'accompanistName',
      'accompanistWorkplace',
    ],
  },
  { key: 'review', fields: [] },
] as const satisfies readonly {
  key: keyof Dictionary['registration']['steps'];
  fields: readonly FieldPath<RegistrationInput>[];
}[];

/**
 * Show or hide a step.
 *
 * `hidden` as an HTML attribute is not enough here: the browser applies it as
 * `[hidden] { display: none }` from the UA stylesheet, and Tailwind's `.flex`
 * (`display: flex`) overrides it — which is why every step rendered at once. Toggling
 * the `hidden` *utility class* instead keeps `display: none` authoritative.
 *
 * Steps stay mounted rather than being unmounted, so a visitor stepping backwards finds
 * their answers — and the browser's autofill state — intact.
 */
function stepClass(visible: boolean, gap = 'gap-5'): string {
  return visible ? `mt-8 flex flex-col ${gap}` : 'hidden';
}

const MONTH_NAMES: Record<Locale, string[]> = {
  uz: [
    '01 — Yanvar',
    '02 — Fevral',
    '03 — Mart',
    '04 — Aprel',
    '05 — May',
    '06 — Iyun',
    '07 — Iyul',
    '08 — Avgust',
    '09 — Sentyabr',
    '10 — Oktyabr',
    '11 — Noyabr',
    '12 — Dekabr',
  ],
  ru: [
    '01 — Январь',
    '02 — Февраль',
    '03 — Март',
    '04 — Апрель',
    '05 — Май',
    '06 — Июнь',
    '07 — Июль',
    '08 — Август',
    '09 — Сентябрь',
    '10 — Октябрь',
    '11 — Ноябрь',
    '12 — Декабрь',
  ],
  en: [
    '01 — January',
    '02 — February',
    '03 — March',
    '04 — April',
    '05 — May',
    '06 — June',
    '07 — July',
    '08 — August',
    '09 — September',
    '10 — October',
    '11 — November',
    '12 — December',
  ],
};

const PLACEHOLDERS: Record<Locale, { day: string; month: string; year: string }> = {
  uz: { day: 'Kun', month: 'Oy', year: 'Yil' },
  ru: { day: 'День', month: 'Месяц', year: 'Год' },
  en: { day: 'Day', month: 'Month', year: 'Year' },
};

function DateOfBirthPicker({
  value = '',
  onChange,
  onBlur,
  locale,
  id,
  ariaInvalid,
  ariaDescribedBy,
}: {
  value?: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  locale: Locale;
  id: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}) {
  const parts = value ? value.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
  const initialYear = parts ? parts[1] : '';
  const initialMonth = parts ? parts[2] : '';
  const initialDay = parts ? parts[3] : '';

  const [day, setDay] = useState(initialDay);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);

  useEffect(() => {
    const p = value ? value.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
    setYear(p ? p[1] : '');
    setMonth(p ? p[2] : '');
    setDay(p ? p[3] : '');
  }, [value]);

  const handleUpdate = (newDay: string, newMonth: string, newYear: string) => {
    setDay(newDay);
    setMonth(newMonth);
    setYear(newYear);

    if (newDay && newMonth && newYear) {
      const d = parseInt(newDay, 10);
      const m = parseInt(newMonth, 10);
      const y = parseInt(newYear, 10);

      const checkDate = new Date(y, m - 1, d);
      if (
        checkDate.getFullYear() === y &&
        checkDate.getMonth() === m - 1 &&
        checkDate.getDate() === d
      ) {
        const iso = `${newYear}-${newMonth.padStart(2, '0')}-${newDay.padStart(2, '0')}`;
        onChange(iso);
        return;
      }
    }
    onChange('');
  };

  const ph = PLACEHOLDERS[locale] ?? PLACEHOLDERS.uz;
  const months = MONTH_NAMES[locale] ?? MONTH_NAMES.uz;

  const daysList = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

  const currentYear = new Date().getFullYear();
  const maxYear = currentYear - MIN_AGE;
  const minYear = 1950;
  const yearsList = Array.from({ length: maxYear - minYear + 1 }, (_, i) => String(maxYear - i));

  return (
    // Equal thirds squeeze the month name ("Сентябрь") into an ellipsis on a phone, so
    // below `sm` the columns are weighted towards it. Unchanged from `sm` up.
    <div
      className="grid grid-cols-[0.8fr_1.5fr_1.1fr] gap-2.5 sm:grid-cols-3 sm:gap-3"
      id={id}
      onBlur={onBlur}
    >
      <Select
        id={`${id}-day`}
        aria-label={ph.day}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        value={day}
        onChange={(e) => handleUpdate(e.target.value, month, year)}
      >
        <option value="">{ph.day}</option>
        {daysList.map((d) => (
          <option key={d} value={d}>
            {parseInt(d, 10)}
          </option>
        ))}
      </Select>

      <Select
        id={`${id}-month`}
        aria-label={ph.month}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        value={month}
        onChange={(e) => handleUpdate(day, e.target.value, year)}
      >
        <option value="">{ph.month}</option>
        {months.map((m, idx) => {
          const val = String(idx + 1).padStart(2, '0');
          return (
            <option key={val} value={val}>
              {m}
            </option>
          );
        })}
      </Select>

      <Select
        id={`${id}-year`}
        aria-label={ph.year}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        value={year}
        onChange={(e) => handleUpdate(day, month, e.target.value)}
      >
        <option value="">{ph.year}</option>
        {yearsList.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function RegistrationForm({
  locale,
  dictionary,
  nominations,
}: {
  locale: Locale;
  dictionary: Dictionary;
  nominations: NominationOption[];
}) {
  const r = dictionary.registration;
  const [stepIndex, setStepIndex] = useState(0);
  const [reference, setReference] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    // Re-validate as the visitor corrects a field, but do not shout before they have
    // finished typing it the first time.
    mode: 'onTouched',
    defaultValues: {
      firstName: '', lastName: '', middleName: '', birthDate: '',
      institution: '', faculty: '', position: '',
      address: '', email: '', phone: '',
      programmeRound1: '', programmeRound2: '', programmeRound3: '',
      accompanistName: '', accompanistWorkplace: '', nominationId: '',
      consent: undefined as unknown as true,
      website: '',
    },
  });

  const step = STEPS[stepIndex]!;
  const isReview = step.key === 'review';

  async function goNext() {
    // Spread rather than cast: `step.fields` is a readonly tuple and `trigger` wants a
    // mutable array.
    const valid = await trigger([...step.fields], { shouldFocus: true });
    if (!valid) return;
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    // The form can be taller than the viewport; without this the next step opens
    // scrolled to its middle.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await submitRegistration(values);

    if (result.ok) {
      setReference(result.reference);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setFormError(
      result.reason === 'rate_limited'
        ? r.errors.rateLimited
        : result.reason === 'duplicate'
          ? r.errors.duplicate
          : r.errors.generic,
    );
  });

  if (reference) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center rounded-card border border-success/30 bg-success/10 px-6 py-14 text-center">
        <CheckCircle2 className="size-12 text-success" aria-hidden />
        <h2 role="status" className="mt-6 font-display text-display-sm font-semibold">
          {r.success.title}
        </h2>
        <p className="mt-4 leading-relaxed text-muted-foreground">{r.success.body}</p>

        <div className="mt-8 w-full rounded-card border border-gold/40 bg-background px-6 py-5">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {r.success.referenceLabel}
          </p>
          <p className="mt-2 font-display text-2xl font-bold tracking-wider text-primary">
            {reference}
          </p>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{r.success.referenceHint}</p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button asChild pill>
            <Link href={localizeHref('/', locale)}>{r.success.backHome}</Link>
          </Button>
          <Button asChild variant="outline" pill>
            <Link href={localizeHref('/regulations', locale)}>{r.success.readRegulations}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const required = dictionary.validation.required;

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto max-w-3xl">
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {STEPS.map((entry, index) => (
          <li key={entry.key} className="flex items-center gap-3">
            <span
              className={cn(
                'flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em]',
                index === stepIndex
                  ? 'text-primary'
                  : index < stepIndex
                    ? 'text-gold-ink'
                    : 'text-muted-foreground/60',
              )}
              aria-current={index === stepIndex ? 'step' : undefined}
            >
              <span
                className={cn(
                  'grid size-6 place-items-center rounded-full border text-[0.625rem]',
                  index === stepIndex
                    ? 'border-primary bg-primary text-primary-foreground'
                    : index < stepIndex
                      ? 'border-gold text-gold-ink'
                      : 'border-border',
                )}
              >
                {index + 1}
              </span>
              <span className="hidden sm:inline">{r.steps[entry.key].title}</span>
            </span>
            {index < STEPS.length - 1 ? (
              <span aria-hidden className="h-px w-4 bg-border" />
            ) : null}
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-card border border-border bg-card p-6 shadow-card sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-ink">
          {interpolate(r.stepOf, { current: stepIndex + 1, total: STEPS.length })}
        </p>
        <h2 className="mt-3 font-display text-display-sm font-semibold">
          {r.steps[step.key].title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{r.steps[step.key].description}</p>

        {/* Honeypot — see `contact-form.tsx`. */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="reg-website">Website</label>
          <input id="reg-website" tabIndex={-1} autoComplete="off" {...register('website')} />
        </div>

        {/*
          Every step stays mounted and is hidden with `hidden` rather than unmounted.
          Unmounting would drop the DOM nodes react-hook-form focuses on error, and would
          discard native autofill state when a visitor steps backwards.
        */}
        <div className={stepClass(step.key === 'personal')}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="reg-lastName" label={r.fields.lastName} required error={errors.lastName && required}>
              {(p) => <Input {...p} {...register('lastName')} autoComplete="family-name" placeholder={r.placeholders.lastName} />}
            </Field>
            <Field id="reg-firstName" label={r.fields.firstName} required error={errors.firstName && required}>
              {(p) => <Input {...p} {...register('firstName')} autoComplete="given-name" placeholder={r.placeholders.firstName} />}
            </Field>
          </div>
          <Field id="reg-middleName" label={r.fields.middleName} optionalLabel={dictionary.common.optional}>
            {(p) => <Input {...p} {...register('middleName')} autoComplete="additional-name" placeholder={r.placeholders.middleName} />}
          </Field>
          <Field
            id="reg-birthDate"
            label={r.fields.birthDate}
            required
            hint={r.hints.age}
            error={errors.birthDate && dictionary.validation.date}
          >
            {(p) => (
              <Controller
                control={control}
                name="birthDate"
                render={({ field }) => (
                  <DateOfBirthPicker
                    id={p.id}
                    ariaInvalid={p['aria-invalid']}
                    ariaDescribedBy={p['aria-describedby']}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    locale={locale}
                  />
                )}
              />
            )}
          </Field>
        </div>

        <div className={stepClass(step.key === 'education')}>
          <Field id="reg-institution" label={r.fields.institution} optionalLabel={dictionary.common.optional}>
            {(p) => <Input {...p} {...register('institution')} placeholder={r.placeholders.institution} />}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="reg-faculty" label={r.fields.faculty} optionalLabel={dictionary.common.optional}>
              {(p) => <Input {...p} {...register('faculty')} placeholder={r.placeholders.faculty} />}
            </Field>
            <Field id="reg-position" label={r.fields.position} optionalLabel={dictionary.common.optional}>
              {(p) => <Input {...p} {...register('position')} placeholder={r.placeholders.position} />}
            </Field>
          </div>
        </div>

        <div className={stepClass(step.key === 'contact')}>
          <Field id="reg-address" label={r.fields.address} required error={errors.address && required}>
            {(p) => <Input {...p} {...register('address')} autoComplete="street-address" placeholder={r.placeholders.address} />}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="reg-email" label={r.fields.email} required error={errors.email && dictionary.validation.email}>
              {(p) => <Input {...p} {...register('email')} type="email" autoComplete="email" placeholder={r.placeholders.email} />}
            </Field>
            <Field id="reg-phone" label={r.fields.phone} required error={errors.phone && dictionary.validation.phone}>
              {(p) => <Input {...p} {...register('phone')} type="tel" autoComplete="tel" placeholder={r.placeholders.phone} />}
            </Field>
          </div>
        </div>

        <div className={stepClass(step.key === 'programme')}>
          <Field id="reg-nomination" label={r.fields.nomination} optionalLabel={dictionary.common.optional}>
            {(p) => (
              <Select {...p} {...register('nominationId')} defaultValue="">
                <option value="">{r.placeholders.select}</option>
                {nominations.map((nomination) => (
                  <option key={nomination.id} value={nomination.id}>
                    {nomination.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            id="reg-round1"
            label={r.fields.round1}
            required
            hint={r.hints.rounds}
            error={errors.programmeRound1 && required}
          >
            {(p) => <Textarea {...p} {...register('programmeRound1')} rows={3} placeholder={r.placeholders.round} />}
          </Field>
          <Field id="reg-round2" label={r.fields.round2} optionalLabel={dictionary.common.optional}>
            {(p) => <Textarea {...p} {...register('programmeRound2')} rows={3} placeholder={r.placeholders.round} />}
          </Field>
          <Field id="reg-round3" label={r.fields.round3} optionalLabel={dictionary.common.optional}>
            {(p) => <Textarea {...p} {...register('programmeRound3')} rows={3} placeholder={r.placeholders.round} />}
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="reg-accompanist"
              label={r.fields.accompanistName}
              optionalLabel={dictionary.common.optional}
              hint={r.hints.accompanist}
            >
              {(p) => <Input {...p} {...register('accompanistName')} placeholder={r.placeholders.accompanistName} />}
            </Field>
            <Field
              id="reg-accompanistWork"
              label={r.fields.accompanistWorkplace}
              optionalLabel={dictionary.common.optional}
            >
              {(p) => <Input {...p} {...register('accompanistWorkplace')} placeholder={r.placeholders.accompanistWorkplace} />}
            </Field>
          </div>
        </div>

        <div className={stepClass(isReview, 'gap-6')}>
          <div>
            <h3 className="font-display text-lg font-semibold">{r.review.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.review.body}</p>
          </div>

          {isReview ? <ReviewList values={getValues()} dictionary={dictionary} nominations={nominations} /> : null}

          <label className="flex cursor-pointer items-start gap-3 rounded-card border border-border bg-surface p-4">
            <input
              type="checkbox"
              {...register('consent')}
              className="mt-0.5 size-4 shrink-0 accent-[hsl(var(--primary))]"
              aria-invalid={Boolean(errors.consent)}
            />
            <span className="text-sm leading-relaxed">{r.fields.consent}</span>
          </label>
          {errors.consent ? (
            <p role="alert" className="-mt-3 text-xs font-medium text-destructive">
              {dictionary.validation.consent}
            </p>
          ) : null}

          <p className="text-xs leading-relaxed text-muted-foreground">{r.hints.privacy}</p>

          {formError ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {formError}
            </p>
          ) : null}
        </div>

        {/* Both buttons carry `whitespace-nowrap`, so side by side they overflow a 360px
            screen once the labels are Russian. Below `sm` they stack full width, primary
            first — which is also the easier thumb target. */}
        <div className="mt-10 flex flex-col-reverse gap-3 border-t border-border pt-7 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={stepIndex === 0}
            className="group"
          >
            <ArrowLeft className="transition-transform duration-300 group-hover:-translate-x-1 rtl:rotate-180" />
            {r.actions.previous}
          </Button>

          {isReview ? (
            <Button type="submit" size="lg" pill disabled={isSubmitting}>
              <Send />
              {isSubmitting ? r.actions.submitting : r.actions.submit}
            </Button>
          ) : (
            <Button type="button" size="lg" pill onClick={goNext} className="group">
              {r.actions.next}
              <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180" />
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

/** Read-back of everything entered, so the final step is a real check and not a formality. */
function ReviewList({
  values,
  dictionary,
  nominations,
}: {
  values: RegistrationInput;
  dictionary: Dictionary;
  nominations: NominationOption[];
}) {
  const r = dictionary.registration;

  const rows: [string, string | undefined][] = [
    [r.fields.lastName, values.lastName],
    [r.fields.firstName, values.firstName],
    [r.fields.middleName, values.middleName],
    [r.fields.birthDate, values.birthDate],
    [r.fields.institution, values.institution],
    [r.fields.faculty, values.faculty],
    [r.fields.position, values.position],
    [r.fields.address, values.address],
    [r.fields.email, values.email],
    [r.fields.phone, values.phone],
    [r.fields.nomination, nominations.find((n) => n.id === values.nominationId)?.name],
    [r.fields.round1, values.programmeRound1],
    [r.fields.round2, values.programmeRound2],
    [r.fields.round3, values.programmeRound3],
    [r.fields.accompanistName, values.accompanistName],
    [r.fields.accompanistWorkplace, values.accompanistWorkplace],
  ];

  const filled = rows.filter(([, value]) => value && value.trim().length > 0);

  return (
    <dl className="divide-y divide-border rounded-card border border-border">
      {filled.map(([label, value]) => (
        <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,0.5fr)_minmax(0,1fr)] sm:gap-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {label}
          </dt>
          <dd className="whitespace-pre-line text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

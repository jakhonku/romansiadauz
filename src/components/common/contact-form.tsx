'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { contactSchema, type ContactInput } from '@/lib/validation/contact';
import { submitContactMessage } from '@/server/actions/contact';

export interface ContactFormLabels {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  namePlaceholder: string;
  messagePlaceholder: string;
  submit: string;
  submitting: string;
  success: string;
  error: string;
  required: string;
  optional: string;
}

/**
 * Contact form.
 *
 * Validated with the same Zod schema the Server Action uses, so the two cannot drift.
 * The action is the real gate — this copy only saves a round trip.
 */
export function ContactForm({ labels }: { labels: ContactFormLabels }) {
  const [status, setStatus] = useState<'idle' | 'sent' | 'failed'>('idle');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', phone: '', subject: '', message: '', website: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await submitContactMessage(values);
    if (result.ok) {
      setStatus('sent');
      reset();
    } else {
      setStatus('failed');
    }
  });

  if (status === 'sent') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-card border border-success/30 bg-success/10 px-6 py-14 text-center">
        <CheckCircle2 className="size-9 text-success" aria-hidden />
        {/* `role="status"` announces the outcome without stealing focus. */}
        <p role="status" className="max-w-sm text-sm leading-relaxed text-foreground">
          {labels.success}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {/* Honeypot: off-screen, not `display:none` (some bots skip hidden inputs), and
          removed from the tab order and the accessibility tree. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="contact-name"
          label={labels.name}
          required
          error={errors.name && labels.required}
        >
          {(props) => (
            <Input
              {...props}
              {...register('name')}
              autoComplete="name"
              placeholder={labels.namePlaceholder}
            />
          )}
        </Field>

        <Field
          id="contact-email"
          label={labels.email}
          required
          error={errors.email && labels.required}
        >
          {(props) => (
            <Input {...props} {...register('email')} type="email" autoComplete="email" />
          )}
        </Field>

        <Field id="contact-phone" label={labels.phone} optionalLabel={labels.optional}>
          {(props) => <Input {...props} {...register('phone')} type="tel" autoComplete="tel" />}
        </Field>

        <Field id="contact-subject" label={labels.subject} optionalLabel={labels.optional}>
          {(props) => <Input {...props} {...register('subject')} />}
        </Field>
      </div>

      <Field
        id="contact-message"
        label={labels.message}
        required
        error={errors.message && labels.required}
      >
        {(props) => (
          <Textarea {...props} {...register('message')} rows={6} placeholder={labels.messagePlaceholder} />
        )}
      </Field>

      {status === 'failed' ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {labels.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" pill disabled={isSubmitting} className="self-start">
        <Send />
        {isSubmitting ? labels.submitting : labels.submit}
      </Button>
    </form>
  );
}

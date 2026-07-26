'use client';

import { LogIn } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { signIn, type SignInResult } from '@/server/actions/auth';

export interface LoginLabels {
  email: string;
  password: string;
  submit: string;
  submitting: string;
  error: string;
  inactive: string;
  rateLimited: string;
}

/**
 * Staff sign-in form.
 *
 * The action redirects on success, so there is no success branch here — anything that
 * comes back is a failure. Errors are deliberately indistinguishable between "no such
 * account" and "wrong password": telling an attacker which addresses exist turns a
 * password guess into an account-enumeration oracle.
 */
export function AdminLoginForm({ next, labels }: { next?: string; labels: LoginLabels }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = (await signIn(formData)) as SignInResult | undefined;
      if (!result) return; // Redirected.

      setError(
        result.reason === 'inactive'
          ? labels.inactive
          : result.reason === 'rate_limited'
            ? labels.rateLimited
            : labels.error,
      );
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field id="admin-email" label={labels.email} required>
        {(props) => (
          <Input
            {...props}
            name="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
          />
        )}
      </Field>

      <Field id="admin-password" label={labels.password} required>
        {(props) => (
          <Input
            {...props}
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        )}
      </Field>

      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        <LogIn />
        {pending ? labels.submitting : labels.submit}
      </Button>
    </form>
  );
}

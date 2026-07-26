'use client';

import { CheckCircle2, UserPlus } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { inviteUser } from '@/server/actions/admin-users';
import type { AppRole } from '@/types/database.types';

export function UserInvite({
  roles,
  labels,
}: {
  roles: Record<AppRole, string>;
  labels: {
    title: string;
    email: string;
    name: string;
    role: string;
    submit: string;
    sending: string;
    sent: string;
    failed: string;
  };
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<AppRole>('viewer');
  const [status, setStatus] = useState<'idle' | 'sent' | 'failed'>('idle');
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setStatus('idle');
        startTransition(async () => {
          const result = await inviteUser(email, name, role);
          if (result.ok) {
            setStatus('sent');
            setEmail('');
            setName('');
          } else {
            setStatus('failed');
          }
        });
      }}
      className="rounded-card border border-border bg-card p-5 shadow-card"
    >
      <h2 className="font-display text-lg font-semibold">{labels.title}</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field id="invite-email" label={labels.email} required>
          {(props) => (
            <Input
              {...props}
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          )}
        </Field>

        <Field id="invite-name" label={labels.name} required>
          {(props) => (
            <Input
              {...props}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </Field>

        <Field id="invite-role" label={labels.role} required>
          {(props) => (
            <Select
              {...props}
              value={role}
              onChange={(event) => setRole(event.target.value as AppRole)}
            >
              {(Object.keys(roles) as AppRole[]).map((value) => (
                <option key={value} value={value}>
                  {roles[value]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          <UserPlus />
          {pending ? labels.sending : labels.submit}
        </Button>

        {status === 'sent' ? (
          <span role="status" className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="size-4" />
            {labels.sent}
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

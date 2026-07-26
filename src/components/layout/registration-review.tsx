'use client';

import { Check, RotateCcw, X } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import { reopenRegistration, reviewRegistration } from '@/server/actions/admin-registrations';
import type { RegistrationStatus } from '@/types/database.types';

export interface ReviewLabels {
  decision: string;
  approve: string;
  reject: string;
  reopen: string;
  note: string;
  notePlaceholder: string;
  saving: string;
  error: string;
  approvedNotice: string;
  rejectedNotice: string;
  confirmReject: string;
}

/**
 * Approve / reject controls.
 *
 * Rejection asks for confirmation, approval does not. The asymmetry is intentional: an
 * accidental approval is corrected by rejecting, but a rejected applicant may already
 * have been emailed by the time anyone notices. Both are reversible through "reopen",
 * which is what makes the whole panel safe to operate quickly.
 */
export function RegistrationReview({
  id,
  status,
  initialNote,
  labels,
}: {
  id: string;
  status: RegistrationStatus;
  initialNote: string | null;
  labels: ReviewLabels;
}) {
  const [note, setNote] = useState(initialNote ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(next: 'approved' | 'rejected') {
    if (next === 'rejected' && !window.confirm(labels.confirmReject)) return;

    setError(null);
    startTransition(async () => {
      const result = await reviewRegistration(id, next, note);
      if (!result.ok) setError(labels.error);
    });
  }

  function reopen() {
    setError(null);
    startTransition(async () => {
      const result = await reopenRegistration(id);
      if (!result.ok) setError(labels.error);
    });
  }

  const decided = status !== 'pending';

  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <h2 className="font-display text-lg font-semibold">{labels.decision}</h2>

      {decided ? (
        <p
          role="status"
          className="mt-3 text-sm font-medium"
          data-status={status}
        >
          {status === 'approved' ? labels.approvedNotice : labels.rejectedNotice}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-2">
        <label htmlFor="review-note" className="text-sm font-medium">
          {labels.note}
        </label>
        <Textarea
          id="review-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder={labels.notePlaceholder}
          disabled={pending}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        {decided ? (
          <Button variant="outline" onClick={reopen} disabled={pending}>
            <RotateCcw />
            {pending ? labels.saving : labels.reopen}
          </Button>
        ) : (
          <>
            <Button onClick={() => decide('approved')} disabled={pending}>
              <Check />
              {pending ? labels.saving : labels.approve}
            </Button>
            <Button variant="destructive" onClick={() => decide('rejected')} disabled={pending}>
              <X />
              {labels.reject}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

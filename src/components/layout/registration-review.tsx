'use client';

import { Check, RotateCcw, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import {
  deleteRegistration,
  reopenRegistration,
  reviewRegistration,
} from '@/server/actions/admin-registrations';
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
  delete: string;
  deleteHint: string;
  confirmDelete: string;
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
  /** Only an administrator may delete; the page decides, this only draws the control. */
  canDelete = false,
  labels,
}: {
  id: string;
  status: RegistrationStatus;
  initialNote: string | null;
  canDelete?: boolean;
  labels: ReviewLabels;
}) {
  const router = useRouter();
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

  function remove() {
    if (!window.confirm(labels.confirmDelete)) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteRegistration(id);
      if (result.ok) {
        // The row this page is built from no longer exists, so staying here would 404 on
        // the next refresh.
        router.replace('/admin/registrations');
        router.refresh();
      } else {
        setError(labels.error);
      }
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

      {/* Kept apart from the decision buttons by a rule and its own explanation. Rejecting
          and deleting sit one click from each other otherwise, and only one of them can
          be taken back. */}
      {canDelete ? (
        <div className="mt-7 border-t border-border pt-5">
          <p className="text-xs leading-relaxed text-muted-foreground">{labels.deleteHint}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={remove}
            disabled={pending}
            className="mt-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 />
            {labels.delete}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

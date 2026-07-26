'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/field';
import { setUserActive, setUserRole } from '@/server/actions/admin-users';
import type { AppRole } from '@/types/database.types';

export interface UserControlLabels {
  roles: Record<AppRole, string>;
  active: string;
  inactive: string;
  lastAdmin: string;
  selfChange: string;
  error: string;
}

/**
 * Role select and activate/deactivate toggle for one staff row.
 *
 * Both controls are disabled for the signed-in user's own row. The server refuses those
 * changes anyway (see `admin-users.ts`), but a control that silently fails is worse
 * than one that is visibly unavailable.
 */
export function UserRowControls({
  userId,
  role,
  isActive,
  isSelf,
  labels,
}: {
  userId: string;
  role: AppRole;
  isActive: boolean;
  isSelf: boolean;
  labels: UserControlLabels;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function translate(message: string): string {
    if (message === 'last_admin') return labels.lastAdmin;
    if (message === 'self_role_change' || message === 'self_deactivate') return labels.selfChange;
    return labels.error;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={role}
        disabled={isSelf || pending}
        aria-label={labels.roles[role]}
        className="h-9 w-auto min-w-[9rem] text-xs"
        onChange={(event) => {
          const next = event.target.value;
          setError(null);
          startTransition(async () => {
            const result = await setUserRole(userId, next);
            if (!result.ok) setError(translate(result.message));
          });
        }}
      >
        {(Object.keys(labels.roles) as AppRole[]).map((value) => (
          <option key={value} value={value}>
            {labels.roles[value]}
          </option>
        ))}
      </Select>

      <Button
        variant={isActive ? 'ghost' : 'outline'}
        size="sm"
        disabled={isSelf || pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await setUserActive(userId, !isActive);
            if (!result.ok) setError(translate(result.message));
          });
        }}
      >
        {isActive ? labels.active : labels.inactive}
      </Button>

      {error ? (
        <span role="alert" className="text-xs font-medium text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}

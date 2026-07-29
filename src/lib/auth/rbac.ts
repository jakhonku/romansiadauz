import type { AppRole } from '@/types/database.types';

/**
 * Role-based access control, in one table.
 *
 * This mirrors the matrix in ARCHITECTURE §6 and the SQL helpers in
 * `0001_foundation.sql` (`can_manage_content`, `can_review_applications`,
 * `is_admin`). Three copies of the same rules is deliberate defence in depth — route,
 * action and row — but it also means a change here without the matching change in SQL
 * produces a UI that offers a button the database will refuse. Change both.
 *
 * This module is intentionally dependency-free and synchronous so it can be imported
 * from Client Components (to hide controls) as well as from actions (to enforce).
 * Hiding a control is never the enforcement; `requirePermission` in `session.ts` is.
 */

export const PERMISSIONS = [
  'dashboard.view',
  'content.manage',
  'registrations.review',
  /**
   * Separate from `registrations.review` and held by `admin` alone, because the two are
   * different in kind: a decision is reversible through "reopen", a deletion destroys
   * someone's submission. This mirrors `registrations_admin_delete` in 0007, which
   * already restricts the DELETE to `is_admin()`.
   */
  'registrations.delete',
  'messages.review',
  'users.manage',
  'settings.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const MATRIX: Record<AppRole, readonly Permission[]> = {
  admin: [
    'dashboard.view',
    'content.manage',
    'registrations.review',
    'registrations.delete',
    'messages.review',
    'users.manage',
    'settings.manage',
  ],
  // News, gallery, videos, pages, judges, winners, partners, events.
  editor: ['dashboard.view', 'content.manage'],
  // Applications and contact messages, but no editorial surface.
  moderator: ['dashboard.view', 'registrations.review', 'messages.review'],
  // Read-only presence: sees the dashboard, changes nothing.
  viewer: ['dashboard.view'],
};

export function can(role: AppRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return MATRIX[role]?.includes(permission) ?? false;
}

/** Every permission a role holds — handy for building the sidebar in one pass. */
export function permissionsFor(role: AppRole | null | undefined): readonly Permission[] {
  return role ? (MATRIX[role] ?? []) : [];
}

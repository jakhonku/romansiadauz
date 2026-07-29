-- =============================================================================
-- 0013 — Make `registrations_admin_delete` reachable
-- =============================================================================
-- 0007 created a DELETE policy on `public.registrations` restricted to
-- `is_admin()`, but 0009 granted only `select, update` on that table. A policy
-- cannot rescue a privilege that was never granted: Postgres refuses at the
-- table level first, so the policy has never once been evaluated and the delete
-- fails with "permission denied for table registrations".
--
-- This is the missing half of that pair, not a widening of it. The grant makes
-- the statement *reachable*; `registrations_admin_delete` still decides who may
-- run it, and that is administrators alone — a moderator can decide an
-- application but not erase it.
-- =============================================================================

grant delete on public.registrations to authenticated;

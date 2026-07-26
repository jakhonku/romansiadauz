-- =============================================================================
-- 0010 — Row level security for `nominations`
-- =============================================================================
-- `nominations` was added to 0002 when the application form was aligned with the
-- official paper blank, but it was never added to either list in 0007 — not the
-- `enable row level security` loop, and not the reference-data policy loop.
--
-- The result was a table that had RLS on (Postgres denies everything by default
-- once RLS is enabled and no policy matches) with no policy to admit anyone.
-- `anon` saw zero nominations while `service_role`, which bypasses RLS, saw all
-- five — so the application form's nomination dropdown was silently empty while
-- the data was plainly there in the dashboard.
--
-- Treated the same as `regions`, `voice_types` and `age_categories`: world
-- readable, admin writable. These are seeded lists that a visitor must be able to
-- read in order to fill in the form at all.
-- =============================================================================

alter table public.nominations enable row level security;
-- FORCE so the policies apply to the table owner too, matching every other table.
alter table public.nominations force row level security;

drop policy if exists nominations_public_read on public.nominations;
create policy nominations_public_read on public.nominations
  for select to anon, authenticated using (true);

drop policy if exists nominations_admin_write on public.nominations;
create policy nominations_admin_write on public.nominations
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 0009 grants this table alongside the other reference lists; repeated here so
-- the migration stands on its own if applied out of order.
grant select on public.nominations to anon, authenticated;
grant insert, update, delete on public.nominations to authenticated;
grant all on public.nominations to service_role;

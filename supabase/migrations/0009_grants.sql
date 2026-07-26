-- =============================================================================
-- 0009 — Table privileges
-- =============================================================================
-- Fixes a real gap in 0007: it enabled RLS and wrote policies for every table,
-- but never granted the underlying table privileges.
--
-- Those are two independent checks, and Postgres applies them in this order:
--
--     1. Does the role hold the privilege (GRANT)?  -> if not, permission denied
--     2. Do the row policies admit this row (RLS)?  -> if not, zero rows
--
-- A policy is therefore *unreachable* without a grant. The symptom is
-- `42501: permission denied for table regions`, not an empty result — which is
-- exactly what every public list was getting.
--
-- Supabase's hosted projects normally configure ALTER DEFAULT PRIVILEGES so new
-- tables in `public` pick up role grants automatically, and 0007 leaned on that
-- implicitly. On this project it did not happen — even `service_role` was denied,
-- which is how the gap was found. Relying on it was wrong regardless: it does not
-- hold for `supabase db reset`, for a self-hosted instance, or when the migration
-- runs as a different role. Granting explicitly makes the schema self-contained.
--
-- SECURITY NOTE — a grant is not an authorisation decision. RLS still decides
-- which rows each role sees; these statements only make the policies reachable.
-- The tables that must stay invisible to the public (`registrations`,
-- `contact_messages`, `profiles`, `audit_logs`, `rate_limits`) are deliberately
-- absent from the `anon` list, matching the matrix in ARCHITECTURE §6.
-- =============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- service_role — full access, no exceptions
-- -----------------------------------------------------------------------------
-- The service-role key bypasses RLS but still needs table privileges. Every
-- public write goes through it: the registration and contact Server Actions
-- (those tables have no `anon` INSERT policy by design), the rate limiter, and
-- staff invitations. Without this the entire submission path returns 42501.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- -----------------------------------------------------------------------------
-- Publicly readable: reference lists, editorial content, their translations
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  public_tables text[] := array[
    'regions', 'districts', 'voice_types', 'age_categories', 'nominations',
    'news_categories', 'news_category_translations', 'news', 'news_translations',
    'judges', 'judge_translations',
    'albums', 'album_translations', 'photos', 'photo_translations',
    'video_categories', 'video_category_translations', 'videos', 'video_translations',
    'winners', 'winner_translations',
    'partners', 'partner_translations',
    'events', 'event_translations',
    'pages', 'page_translations'
  ];
begin
  foreach t in array public_tables loop
    -- anon reads; the `status = 'published'` policies from 0007 do the filtering.
    execute format('grant select on public.%I to anon, authenticated', t);

    -- Staff write through the admin panel. Which staff, and which rows, is
    -- settled by `can_manage_content()` in the policies — not by this grant.
    execute format('grant insert, update, delete on public.%I to authenticated', t);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- Applications and messages — staff only, never `anon`
-- -----------------------------------------------------------------------------
grant select, update on public.registrations to authenticated;
grant select, update on public.contact_messages to authenticated;

-- Admin user management. `profiles_select_self` and `profiles_admin_all` decide
-- whose row is visible.
grant select, update on public.profiles to authenticated;

-- Append-only audit trail: 0007 grants no UPDATE or DELETE policy, and neither
-- does this.
grant select, insert on public.audit_logs to authenticated;
grant usage on sequence public.audit_logs_id_seq to authenticated;

-- -----------------------------------------------------------------------------
-- Re-assert the two deliberate restrictions
-- -----------------------------------------------------------------------------
-- `grant all ... to service_role` above is broad by design, but the blanket
-- grants must not leak to the public roles. These repeat 0007's intent so the
-- order in which the migrations run cannot undo it.
--
-- `rate_limits`: service-role only.
revoke all on public.rate_limits from anon, authenticated;

-- `site_settings`: column-level, so the `smtp` column holding the mail password
-- stays unreadable. RLS is row-level and cannot hide a column.
revoke select on public.site_settings from anon, authenticated;
grant select (id, branding, contacts, social, seo, analytics, stats, updated_at)
  on public.site_settings to anon, authenticated;
grant update (branding, contacts, social, seo, analytics, stats, updated_by)
  on public.site_settings to authenticated;

-- -----------------------------------------------------------------------------
-- Future tables
-- -----------------------------------------------------------------------------
-- Keeps a later migration from reintroducing the same gap by forgetting a grant.
alter default privileges in schema public
  grant select on tables to anon, authenticated;
alter default privileges in schema public
  grant insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;

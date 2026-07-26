-- =============================================================================
-- 0007 — Row Level Security
-- =============================================================================
-- RLS is enabled on EVERY table in `public`. There are no exceptions and no
-- "we'll add it later" tables: an un-enabled table in a Supabase project is
-- world-readable through PostgREST the moment the publishable key leaks.
--
-- Reading model:
--   anon / authenticated  →  published editorial content only
--   staff (any role)      →  read everything in the admin surface
--   editor  / admin       →  write editorial content
--   moderator / admin     →  read + decide applications and messages
--   admin                 →  users, settings, audit
--   service_role          →  bypasses RLS entirely; used only by Server Actions
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles',
    'regions', 'districts', 'voice_types', 'age_categories',
    'news_categories', 'news_category_translations', 'news', 'news_translations',
    'judges', 'judge_translations',
    'albums', 'album_translations', 'photos', 'photo_translations',
    'video_categories', 'video_category_translations', 'videos', 'video_translations',
    'winners', 'winner_translations',
    'partners', 'partner_translations',
    'events', 'event_translations',
    'pages', 'page_translations',
    'registrations', 'contact_messages',
    'site_settings', 'audit_logs', 'rate_limits'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    -- FORCE makes the policies apply to the table owner too, so a mistakenly
    -- owner-authenticated connection cannot quietly read everything.
    execute format('alter table public.%I force row level security', t);
  end loop;
end
$$;

-- Clean slate — makes this migration safe to re-run after policy edits.
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end
$$;

-- =============================================================================
-- Identity
-- =============================================================================
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  -- A user editing their own profile must not be able to promote themselves.
  with check (id = auth.uid() and role = public.auth_role());

create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- Reference data — public read, admin write
-- =============================================================================
do $$
declare
  t text;
begin
  foreach t in array array['regions', 'districts', 'voice_types', 'age_categories']
  loop
    execute format($p$
      create policy %1$I_public_read on public.%1$I
        for select to anon, authenticated using (true)
    $p$, t);

    execute format($p$
      create policy %1$I_admin_write on public.%1$I
        for all to authenticated
        using (public.is_admin()) with check (public.is_admin())
    $p$, t);
  end loop;
end
$$;

-- =============================================================================
-- Editorial content
-- =============================================================================
-- Parent tables: public sees `published`, staff sees everything, editors write.
do $$
declare
  t text;
begin
  foreach t in array array[
    'news', 'judges', 'albums', 'videos', 'winners', 'partners', 'events', 'pages'
  ]
  loop
    execute format($p$
      create policy %1$I_public_read on public.%1$I
        for select to anon, authenticated
        using (status = 'published')
    $p$, t);

    execute format($p$
      create policy %1$I_staff_read on public.%1$I
        for select to authenticated
        using (public.is_staff())
    $p$, t);

    execute format($p$
      create policy %1$I_editor_write on public.%1$I
        for all to authenticated
        using (public.can_manage_content())
        with check (public.can_manage_content())
    $p$, t);
  end loop;
end
$$;

-- Category tables have no draft state — they are either active or not.
do $$
declare
  t text;
begin
  foreach t in array array['news_categories', 'video_categories']
  loop
    execute format($p$
      create policy %1$I_public_read on public.%1$I
        for select to anon, authenticated using (is_active or public.is_staff())
    $p$, t);

    execute format($p$
      create policy %1$I_editor_write on public.%1$I
        for all to authenticated
        using (public.can_manage_content()) with check (public.can_manage_content())
    $p$, t);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- Translation tables
-- -----------------------------------------------------------------------------
-- A translation is exactly as visible as its parent. Expressing that with an
-- EXISTS against the parent means there is one source of truth for publication
-- state; a copy of `status` on the translation row could drift and leak a draft.
do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('news_translations',      'news_id',     'news'),
      ('judge_translations',     'judge_id',    'judges'),
      ('album_translations',     'album_id',    'albums'),
      ('video_translations',     'video_id',    'videos'),
      ('winner_translations',    'winner_id',   'winners'),
      ('partner_translations',   'partner_id',  'partners'),
      ('event_translations',     'event_id',    'events'),
      ('page_translations',      'page_id',     'pages')
    ) as t(child, fk, parent)
  loop
    execute format($p$
      create policy %1$I_public_read on public.%1$I
        for select to anon, authenticated
        using (exists (
          select 1 from public.%3$I p
          where p.id = public.%1$I.%2$I and p.status = 'published'
        ))
    $p$, spec.child, spec.fk, spec.parent);

    execute format($p$
      create policy %1$I_staff_read on public.%1$I
        for select to authenticated using (public.is_staff())
    $p$, spec.child);

    execute format($p$
      create policy %1$I_editor_write on public.%1$I
        for all to authenticated
        using (public.can_manage_content()) with check (public.can_manage_content())
    $p$, spec.child);
  end loop;
end
$$;

-- Category translations follow their (always-visible) parent.
do $$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('news_category_translations',  'category_id', 'news_categories'),
      ('video_category_translations', 'category_id', 'video_categories')
    ) as t(child, fk, parent)
  loop
    execute format($p$
      create policy %1$I_public_read on public.%1$I
        for select to anon, authenticated using (true)
    $p$, spec.child);

    execute format($p$
      create policy %1$I_editor_write on public.%1$I
        for all to authenticated
        using (public.can_manage_content()) with check (public.can_manage_content())
    $p$, spec.child);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- Photos — visible when their album is published
-- -----------------------------------------------------------------------------
create policy photos_public_read on public.photos
  for select to anon, authenticated
  using (exists (
    select 1 from public.albums a where a.id = photos.album_id and a.status = 'published'
  ));

create policy photos_staff_read on public.photos
  for select to authenticated using (public.is_staff());

create policy photos_editor_write on public.photos
  for all to authenticated
  using (public.can_manage_content()) with check (public.can_manage_content());

create policy photo_translations_public_read on public.photo_translations
  for select to anon, authenticated
  using (exists (
    select 1
    from public.photos ph
    join public.albums a on a.id = ph.album_id
    where ph.id = photo_translations.photo_id and a.status = 'published'
  ));

create policy photo_translations_staff_read on public.photo_translations
  for select to authenticated using (public.is_staff());

create policy photo_translations_editor_write on public.photo_translations
  for all to authenticated
  using (public.can_manage_content()) with check (public.can_manage_content());

-- =============================================================================
-- Applications and messages — NO anon access of any kind
-- =============================================================================
-- Note the absence of an INSERT policy for `anon`. Submissions are written by
-- the service-role client inside a Server Action, after Zod validation and a
-- rate-limit check. This is the difference between "the public can add a row"
-- and "the public can add a row that passed our rules".
create policy registrations_reviewer_read on public.registrations
  for select to authenticated
  using (public.can_review_applications());

create policy registrations_reviewer_update on public.registrations
  for update to authenticated
  using (public.can_review_applications())
  with check (public.can_review_applications());

create policy registrations_admin_delete on public.registrations
  for delete to authenticated
  using (public.is_admin());

create policy contact_messages_reviewer_read on public.contact_messages
  for select to authenticated
  using (public.can_review_applications());

create policy contact_messages_reviewer_update on public.contact_messages
  for update to authenticated
  using (public.can_review_applications())
  with check (public.can_review_applications());

create policy contact_messages_admin_delete on public.contact_messages
  for delete to authenticated
  using (public.is_admin());

-- =============================================================================
-- Site settings
-- =============================================================================
-- RLS is row-level and cannot hide a column, so the SMTP password is protected
-- by a column-level GRANT instead. Both layers are required: the policy decides
-- which rows are visible, the grant decides which columns.
create policy site_settings_public_read on public.site_settings
  for select to anon, authenticated using (true);

create policy site_settings_admin_write on public.site_settings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke select on public.site_settings from anon, authenticated;
grant select (id, branding, contacts, social, seo, analytics, stats, updated_at)
  on public.site_settings to anon, authenticated;

-- =============================================================================
-- Audit log — append-only, admin-readable
-- =============================================================================
create policy audit_logs_admin_read on public.audit_logs
  for select to authenticated using (public.is_admin());

create policy audit_logs_staff_insert on public.audit_logs
  for insert to authenticated with check (public.is_staff());
-- Deliberately no UPDATE or DELETE policy: an audit trail that staff can edit
-- is not an audit trail.

-- =============================================================================
-- Rate limits — service_role only
-- =============================================================================
-- No policies at all, so RLS denies every request from anon and authenticated.
-- Only the service-role key (which bypasses RLS) can touch these counters.
revoke all on public.rate_limits from anon, authenticated;

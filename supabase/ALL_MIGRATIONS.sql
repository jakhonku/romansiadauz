-- Romansiada Uzbekistan — barcha migratsiyalar, tartib bilan
-- Idempotent: qayta ishga tushirish xavfsiz.


-- ==========================================================================
-- 0001_foundation.sql
-- ==========================================================================

-- =============================================================================
-- 0001 — Foundation: extensions, enums, shared helpers, identity
-- =============================================================================
-- Everything in this file is idempotent so the migration can be re-applied to a
-- branch database without hand-editing.
-- =============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";       -- trigram indexes for admin search
create extension if not exists "unaccent";      -- accent-insensitive slugs/search
create extension if not exists "citext";        -- case-insensitive e-mail columns

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'editor', 'moderator', 'viewer');
  end if;

  if not exists (select 1 from pg_type where typname = 'content_status') then
    create type public.content_status as enum ('draft', 'published', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'registration_status') then
    create type public.registration_status as enum ('pending', 'approved', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'gender') then
    create type public.gender as enum ('male', 'female');
  end if;

  if not exists (select 1 from pg_type where typname = 'locale_code') then
    create type public.locale_code as enum ('uz', 'ru', 'en');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Shared triggers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at is
  'Generic BEFORE UPDATE trigger keeping updated_at honest regardless of client.';

-- -----------------------------------------------------------------------------
-- Identity
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       citext not null,
  full_name   text   not null default '',
  avatar_path text,
  role        public.app_role not null default 'viewer',
  is_active   boolean not null default true,
  last_seen_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Staff accounts. Mirrors auth.users 1:1 and carries the RBAC role. Festival
   applicants never get an auth account — they submit through a Server Action.';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Provision a profile automatically whenever an auth user is created, so an
-- administrator inviting a colleague never has to touch two tables.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'viewer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- RBAC helpers
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER is essential here. If a policy on `profiles` called a function
-- that itself SELECTed `profiles` under the caller's rights, Postgres would
-- re-evaluate that policy recursively and error out. Running as owner breaks the
-- cycle; `search_path` is pinned so the function cannot be hijacked by a rogue
-- schema earlier on the caller's path.
create or replace function public.auth_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active
$$;

create or replace function public.has_role(variadic allowed public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auth_role() = any (allowed), false)
$$;

-- "Can this user open the admin panel at all?"
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.auth_role() is not null
$$;

-- "Can this user create and edit editorial content?"
create or replace function public.can_manage_content()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin', 'editor')
$$;

-- "Can this user review applications and messages?"
create or replace function public.can_review_applications()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin', 'moderator')
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin')
$$;

revoke execute on function public.auth_role() from anon;
revoke execute on function public.handle_new_user() from anon, authenticated;

-- ==========================================================================
-- 0002_reference_data.sql
-- ==========================================================================

-- =============================================================================
-- 0002 — Reference data
-- =============================================================================
-- Small, seeded, read-mostly lookup lists that populate <Select> options.
--
-- DESIGN NOTE — why these carry name_uz / name_ru / name_en columns instead of the
-- translation tables used for editorial content:
--   * they are always fetched whole (every option, every time) so a join per row
--     buys nothing;
--   * they are seeded by migration and never edited through the CMS, so the
--     "editors must be able to add a language later" argument does not apply;
--   * three columns keep the option query a single index-free sequential scan of
--     ~200 rows rather than a join against a 600-row translation table.
-- Editorial entities make the opposite trade-off, and do use translation tables.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Administrative divisions of Uzbekistan
-- -----------------------------------------------------------------------------
create table if not exists public.regions (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name_uz    text not null,
  name_ru    text not null,
  name_en    text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.districts (
  id         uuid primary key default gen_random_uuid(),
  region_id  uuid not null references public.regions (id) on delete cascade,
  code       text not null unique,
  name_uz    text not null,
  name_ru    text not null,
  name_en    text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Musical classification
-- -----------------------------------------------------------------------------
create table if not exists public.voice_types (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name_uz    text not null,
  name_ru    text not null,
  name_en    text not null,
  sort_order smallint not null default 0
);

comment on table public.voice_types is
  'Soprano, mezzo, tenor, baritone, bass… Selected by the applicant, used by the
   jury to group auditions.';

create table if not exists public.age_categories (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name_uz       text not null,
  name_ru       text not null,
  name_en       text not null,
  min_age       smallint not null,
  max_age       smallint not null,
  duration_minutes smallint not null default 10,
  pieces_count  smallint not null default 2,
  sort_order    smallint not null default 0,
  is_active     boolean not null default true,
  constraint age_categories_range_valid check (min_age >= 0 and max_age > min_age and max_age <= 120)
);

comment on column public.age_categories.duration_minutes is
  'Maximum total stage time for the category, quoted on the Regulations page.';

-- -----------------------------------------------------------------------------
-- Competition nominations
-- -----------------------------------------------------------------------------
-- «Номинация» on the official application form. A seeded lookup rather than free
-- text: the jury groups and reports by nomination, and typed-in variants
-- ("Русский романс" / "русский романс" / "Rus romansi") would make that
-- impossible. Follows the `name_uz/ru/en` convention of the other reference
-- lists — see ARCHITECTURE §4 for why these are not normalised into translation
-- tables.
create table if not exists public.nominations (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name_uz    text not null,
  name_ru    text not null,
  name_en    text not null,
  sort_order smallint not null default 0,
  is_active  boolean not null default true
);

comment on table public.nominations is
  'Categories an applicant competes in, as printed on the paper application form.';

-- ==========================================================================
-- 0003_content.sql
-- ==========================================================================

-- =============================================================================
-- 0003 — Editorial content
-- =============================================================================
-- Every publishable entity follows the same two-table shape:
--
--   <entity>               language-neutral facts (slug, dates, media, status)
--   <entity>_translations  one row per locale, UNIQUE (<entity>_id, locale)
--
-- Keeping the slug and status on the parent means a piece of news has ONE
-- canonical URL and ONE publication state across all three languages, which is
-- what editors expect. Putting them on the translation instead would allow an
-- article to be live in Russian and draft in Uzbek under two different URLs —
-- a permanent source of SEO duplicate-content problems.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- News
-- -----------------------------------------------------------------------------
create table if not exists public.news_categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  sort_order smallint not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.news_category_translations (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.news_categories (id) on delete cascade,
  locale      public.locale_code not null,
  name        text not null,
  description text,
  unique (category_id, locale)
);

create table if not exists public.news (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  category_id  uuid references public.news_categories (id) on delete set null,
  cover_path   text,
  status       public.content_status not null default 'draft',
  published_at timestamptz,
  is_featured  boolean not null default false,
  view_count   integer not null default 0,
  author_id    uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- A published article without a date would sort unpredictably on the news page.
  constraint news_published_has_date check (status <> 'published' or published_at is not null)
);

create table if not exists public.news_translations (
  id              uuid primary key default gen_random_uuid(),
  news_id         uuid not null references public.news (id) on delete cascade,
  locale          public.locale_code not null,
  title           text not null,
  excerpt         text,
  body            text not null default '',
  seo_title       text,
  seo_description text,
  unique (news_id, locale)
);

comment on column public.news_translations.body is
  'Sanitised HTML from the rich-text editor. Sanitisation happens on write in the
   Server Action AND again on render — never trust a single choke point.';

-- -----------------------------------------------------------------------------
-- Jury
-- -----------------------------------------------------------------------------
create table if not exists public.judges (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  photo_path   text,
  country_code text,
  is_chair     boolean not null default false,
  socials      jsonb not null default '{}'::jsonb,
  status       public.content_status not null default 'draft',
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column public.judges.socials is
  'Free-form {platform: url} map. JSONB rather than a table because the set of
   platforms changes with fashion, not with data modelling, and it is only ever
   read as a whole.';

create table if not exists public.judge_translations (
  id           uuid primary key default gen_random_uuid(),
  judge_id     uuid not null references public.judges (id) on delete cascade,
  locale       public.locale_code not null,
  full_name    text not null,
  role_title   text,
  biography    text,
  achievements text,
  unique (judge_id, locale)
);

comment on column public.judge_translations.full_name is
  'Names live in the translation table on purpose: the same person is written
   "Dilnoza Karimova" in Latin and "Дильноза Каримова" in Cyrillic.';

-- -----------------------------------------------------------------------------
-- Photo gallery
-- -----------------------------------------------------------------------------
create table if not exists public.albums (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  cover_path  text,
  event_date  date,
  status      public.content_status not null default 'draft',
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.album_translations (
  id          uuid primary key default gen_random_uuid(),
  album_id    uuid not null references public.albums (id) on delete cascade,
  locale      public.locale_code not null,
  title       text not null,
  description text,
  unique (album_id, locale)
);

create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  album_id     uuid not null references public.albums (id) on delete cascade,
  storage_path text not null,
  width        integer,
  height       integer,
  blur_data_url text,
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now()
);

comment on column public.photos.width is
  'Stored at upload time so <Image> always receives intrinsic dimensions and the
   gallery never causes layout shift.';

create table if not exists public.photo_translations (
  id       uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos (id) on delete cascade,
  locale   public.locale_code not null,
  alt_text text not null default '',
  caption  text,
  unique (photo_id, locale)
);

-- -----------------------------------------------------------------------------
-- Video gallery
-- -----------------------------------------------------------------------------
create table if not exists public.video_categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  sort_order smallint not null default 0,
  is_active  boolean not null default true
);

create table if not exists public.video_category_translations (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.video_categories (id) on delete cascade,
  locale      public.locale_code not null,
  name        text not null,
  unique (category_id, locale)
);

create table if not exists public.videos (
  id               uuid primary key default gen_random_uuid(),
  youtube_id       text not null,
  category_id      uuid references public.video_categories (id) on delete set null,
  duration_seconds integer,
  published_at     timestamptz,
  status           public.content_status not null default 'draft',
  is_featured      boolean not null default false,
  sort_order       smallint not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Guards against an editor pasting a full watch URL into the ID field.
  constraint videos_youtube_id_format check (youtube_id ~ '^[A-Za-z0-9_-]{11}$')
);

create table if not exists public.video_translations (
  id          uuid primary key default gen_random_uuid(),
  video_id    uuid not null references public.videos (id) on delete cascade,
  locale      public.locale_code not null,
  title       text not null,
  description text,
  unique (video_id, locale)
);

-- -----------------------------------------------------------------------------
-- Winners
-- -----------------------------------------------------------------------------
create table if not exists public.winners (
  id          uuid primary key default gen_random_uuid(),
  year        smallint not null,
  place       smallint,
  is_grand_prix boolean not null default false,
  category_id uuid references public.age_categories (id) on delete set null,
  photo_path  text,
  country_code text,
  status      public.content_status not null default 'draft',
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint winners_year_sane check (year between 1990 and 2200),
  constraint winners_place_sane check (place is null or place between 1 and 10),
  -- A Grand Prix holder has no numeric place, and vice versa.
  constraint winners_place_xor_grand_prix check (
    (is_grand_prix and place is null) or (not is_grand_prix and place is not null)
  )
);

create table if not exists public.winner_translations (
  id          uuid primary key default gen_random_uuid(),
  winner_id   uuid not null references public.winners (id) on delete cascade,
  locale      public.locale_code not null,
  full_name   text not null,
  award_title text,
  biography   text,
  unique (winner_id, locale)
);

-- -----------------------------------------------------------------------------
-- Partners
-- -----------------------------------------------------------------------------
create table if not exists public.partners (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  logo_path      text,
  logo_dark_path text,
  website_url    text,
  tier           smallint not null default 3,
  status         public.content_status not null default 'draft',
  sort_order     smallint not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint partners_tier_range check (tier between 1 and 5)
);

comment on column public.partners.logo_dark_path is
  'Optional light-on-dark variant. Without it a dark-mode visitor sees a black
   logo on a black background — the single most common dark-mode regression.';

create table if not exists public.partner_translations (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references public.partners (id) on delete cascade,
  locale      public.locale_code not null,
  name        text not null,
  description text,
  unique (partner_id, locale)
);

-- -----------------------------------------------------------------------------
-- Events (festival calendar)
-- -----------------------------------------------------------------------------
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  starts_at  timestamptz not null,
  ends_at    timestamptz,
  cover_path text,
  status     public.content_status not null default 'draft',
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (ends_at is null or ends_at >= starts_at)
);

create table if not exists public.event_translations (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  locale      public.locale_code not null,
  title       text not null,
  description text,
  location    text,
  unique (event_id, locale)
);

-- -----------------------------------------------------------------------------
-- CMS pages (About, Regulations body, Privacy, …)
-- -----------------------------------------------------------------------------
create table if not exists public.pages (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  status     public.content_status not null default 'draft',
  is_system  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.pages.is_system is
  'System pages back a hard-coded route (e.g. /about). The admin UI lets editors
   change their content but refuses to delete them, which would 404 the nav.';

create table if not exists public.page_translations (
  id              uuid primary key default gen_random_uuid(),
  page_id         uuid not null references public.pages (id) on delete cascade,
  locale          public.locale_code not null,
  title           text not null,
  body            text not null default '',
  seo_title       text,
  seo_description text,
  unique (page_id, locale)
);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'news_categories', 'news', 'judges', 'albums', 'videos',
    'winners', 'partners', 'events', 'pages'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t, t
    );
  end loop;
end
$$;

-- ==========================================================================
-- 0004_registrations.sql
-- ==========================================================================

-- =============================================================================
-- 0004 — Festival applications
-- =============================================================================
-- Mirrors the official paper form, «Заявка на участие в Международном конкурсе
-- молодых исполнителей русского и узбекского романса "Узбекская Романсиада"»,
-- field for field. The organisers' decision is that the online form asks for
-- exactly what the blank asks for and nothing more.
--
-- That decision is also the strongest privacy control in the product. Earlier
-- drafts of this table carried passport numbers, passport scans, portraits and
-- performance videos of applicants who are frequently minors. None of that is
-- on the paper form, so none of it is collected: the columns are gone, the
-- private `applications` bucket is gone with them (see 0008), and the residual
-- exposure of this table is now a name, a date of birth and contact details.
--
-- SECURITY POSTURE — there is deliberately NO `anon` INSERT policy on this
-- table (see 0007_rls.sql). Public submissions travel through a Server Action
-- that validates with Zod, enforces a rate limit, then writes using the
-- service-role client. Consequence: an attacker holding the publishable
-- anon key can neither read nor write applications.
-- =============================================================================

create table if not exists public.registrations (
  id                uuid primary key default gen_random_uuid(),

  -- Human-quotable identifier, e.g. RMS-2026-004821. Generated by trigger below.
  reference_code    text not null unique,

  -- «ФИО конкурсанта» --------------------------------------------------------
  first_name        text not null,
  last_name         text not null,
  middle_name       text,

  -- «Возраст» / «Дата рождения» ----------------------------------------------
  -- Age is not stored. It is a function of the birth date and today, and a
  -- stored copy is wrong the day after it is written.
  birth_date        date not null,

  -- «Название учебного заведения, факультет, место работы (учебы), должность» -
  institution       text,
  faculty           text,
  position_title    text,

  -- «Место жительства» / «E-mail» / «Телефон» --------------------------------
  address           text not null,
  email             citext not null,
  phone             text not null,

  -- «Программа»: I тур / II тур / III тур ------------------------------------
  -- Three columns rather than one repertoire blob, because the form asks for
  -- three and the jury reads them one round at a time. Free text: entries are
  -- "composer — title" lines, one per piece.
  programme_round_1 text,
  programme_round_2 text,
  programme_round_3 text,

  -- «ФИО концертмейстера, место работы» --------------------------------------
  -- The accompanist, not the applicant's teacher. Optional: a competitor may
  -- perform to a backing track or bring no pianist to the first round.
  accompanist_name       text,
  accompanist_workplace  text,

  -- «Номинация» ---------------------------------------------------------------
  nomination_id     uuid references public.nominations (id) on delete restrict,

  -- Review workflow ----------------------------------------------------------
  status            public.registration_status not null default 'pending',
  review_note       text,
  reviewed_by       uuid references public.profiles (id) on delete set null,
  reviewed_at       timestamptz,

  -- Audit / anti-abuse -------------------------------------------------------
  consent_given_at  timestamptz not null default now(),
  submitted_ip      inet,
  user_agent        text,
  locale            public.locale_code not null default 'uz',

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint registrations_birth_date_sane
    check (birth_date > date '1900-01-01' and birth_date < current_date),

  -- A decided application must say who decided it and when.
  constraint registrations_review_complete
    check (status = 'pending' or (reviewed_at is not null))
);

comment on table public.registrations is
  'Festival applications, matching the official paper form field for field.
   Still personal data under Uzbek law No. ZRU-547 — names, dates of birth and
   contact details — but deliberately holds no identity documents.';

comment on column public.registrations.position_title is
  'Должность. Named `position_title` because `position` is a reserved word in
   SQL and would need quoting at every call site.';

drop trigger if exists registrations_set_updated_at on public.registrations;
create trigger registrations_set_updated_at
  before update on public.registrations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Reference code generation
-- -----------------------------------------------------------------------------
-- A per-year sequence keeps codes short and human-readable. Generating it in the
-- database rather than the application removes the read-then-write race that a
-- "SELECT max(...) + 1" in Node would otherwise have under concurrent submissions.
create sequence if not exists public.registration_reference_seq;

create or replace function public.assign_registration_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference_code is null or new.reference_code = '' then
    new.reference_code := format(
      'RMS-%s-%s',
      to_char(now(), 'YYYY'),
      lpad(nextval('public.registration_reference_seq')::text, 6, '0')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists registrations_assign_reference on public.registrations;
create trigger registrations_assign_reference
  before insert on public.registrations
  for each row execute function public.assign_registration_reference();

-- -----------------------------------------------------------------------------
-- Review stamping
-- -----------------------------------------------------------------------------
-- Keeps `reviewed_at` truthful even if an action forgets to set it, and clears
-- the stamp if an application is moved back to `pending`.
create or replace function public.stamp_registration_review()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'pending' then
      new.reviewed_at := null;
      new.reviewed_by := null;
    else
      new.reviewed_at := coalesce(new.reviewed_at, now());
      new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists registrations_stamp_review on public.registrations;
create trigger registrations_stamp_review
  before update on public.registrations
  for each row execute function public.stamp_registration_review();

-- -----------------------------------------------------------------------------
-- Duplicate protection
-- -----------------------------------------------------------------------------
-- Partial unique indexes rather than table constraints: a rejected applicant
-- should be able to re-apply next season, so only live applications collide.
create unique index if not exists registrations_unique_active_email
  on public.registrations (email)
  where status <> 'rejected';

-- E-mail is now the only duplicate check. The passport-number index that used to
-- sit here went with the column: the form does not ask for a passport, so the
-- system has no second identifier to deduplicate on. Two applications from the
-- same person under two addresses are therefore possible, and are left for a
-- reviewer to spot — which is the same position the paper process was in.

-- ==========================================================================
-- 0005_operations.sql
-- ==========================================================================

-- =============================================================================
-- 0005 — Operations: messages, settings, audit trail, rate limiting
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Contact form submissions
-- -----------------------------------------------------------------------------
-- Like `registrations`, this table has no `anon` policy. Messages arrive through
-- a Server Action so that validation and rate limiting cannot be bypassed by
-- talking to PostgREST directly with the publishable key.
create table if not exists public.contact_messages (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        citext not null,
  phone        text,
  subject      text,
  message      text not null,
  is_read      boolean not null default false,
  is_archived  boolean not null default false,
  replied_at   timestamptz,
  handled_by   uuid references public.profiles (id) on delete set null,
  submitted_ip inet,
  locale       public.locale_code not null default 'uz',
  created_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Site settings
-- -----------------------------------------------------------------------------
-- A single row addressed by a CHECK-pinned primary key. This is the standard
-- "singleton table" pattern: it gives settings a stable id to UPDATE against
-- while making a second row physically impossible.
create table if not exists public.site_settings (
  id         smallint primary key default 1,
  branding   jsonb not null default '{}'::jsonb,
  contacts   jsonb not null default '{}'::jsonb,
  social     jsonb not null default '{}'::jsonb,
  seo        jsonb not null default '{}'::jsonb,
  analytics  jsonb not null default '{}'::jsonb,
  stats      jsonb not null default '{}'::jsonb,
  smtp       jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

comment on column public.site_settings.smtp is
  'Mail credentials. Excluded from every public-facing query and from the
   anon SELECT policy — see the column-level grants in 0007_rls.sql.';

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Audit trail
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id         bigserial primary key,
  actor_id   uuid references public.profiles (id) on delete set null,
  actor_email text,
  action     text not null,
  entity     text not null,
  entity_id  text,
  changes    jsonb,
  ip         inet,
  created_at timestamptz not null default now()
);

comment on column public.audit_logs.actor_email is
  'Denormalised on purpose: if a staff account is deleted, actor_id nulls out
   but the record of who approved an application must survive.';

-- -----------------------------------------------------------------------------
-- Rate limiting
-- -----------------------------------------------------------------------------
create table if not exists public.rate_limits (
  bucket_key    text        not null,
  window_start  timestamptz not null,
  request_count integer     not null default 0,
  primary key (bucket_key, window_start)
);

comment on table public.rate_limits is
  'Fixed-window counters, stored in Postgres rather than Redis so the product
   has no second stateful dependency to provision or pay for. A fixed window
   permits a burst of up to 2x the limit across a window boundary; that is an
   acceptable trade for form-submission abuse, which we throttle in minutes,
   not milliseconds.';

-- Atomically increment and report whether the caller is still under the limit.
-- The INSERT ... ON CONFLICT DO UPDATE ... RETURNING is a single statement, so
-- two concurrent submissions cannot both read a stale count and both pass.
create or replace function public.consume_rate_limit(
  p_key            text,
  p_limit          integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_count  integer;
begin
  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits as rl (bucket_key, window_start, request_count)
  values (p_key, v_window, 1)
  on conflict (bucket_key, window_start)
    do update set request_count = rl.request_count + 1
  returning rl.request_count into v_count;

  return v_count <= p_limit;
end;
$$;

-- Housekeeping for the counter table; call from a scheduled job or a cron route.
create or replace function public.prune_rate_limits(p_older_than interval default interval '1 day')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.rate_limits where window_start < now() - p_older_than;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.consume_rate_limit(text, integer, integer) from anon, authenticated;
revoke execute on function public.prune_rate_limits(interval) from anon, authenticated;

-- ==========================================================================
-- 0006_indexes.sql
-- ==========================================================================

-- =============================================================================
-- 0006 — Indexes
-- =============================================================================
-- Each index below exists to serve a query the application actually issues.
-- Indexes are not free: every one of them slows writes and consumes cache, so
-- speculative "might be useful someday" indexes are deliberately absent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Published-list access path
-- -----------------------------------------------------------------------------
-- Every public listing is "WHERE status = 'published' ORDER BY <date> DESC".
-- Partial indexes restricted to published rows are markedly smaller than a full
-- index, because drafts and archived rows — which no public query ever touches —
-- are simply not stored in them.
create index if not exists news_published_idx
  on public.news (published_at desc)
  where status = 'published';

create index if not exists news_featured_idx
  on public.news (published_at desc)
  where status = 'published' and is_featured;

create index if not exists news_category_published_idx
  on public.news (category_id, published_at desc)
  where status = 'published';

create index if not exists videos_published_idx
  on public.videos (published_at desc nulls last)
  where status = 'published';

create index if not exists videos_category_published_idx
  on public.videos (category_id, sort_order)
  where status = 'published';

create index if not exists judges_published_idx
  on public.judges (is_chair desc, sort_order, id)
  where status = 'published';

create index if not exists albums_published_idx
  on public.albums (event_date desc nulls last, sort_order)
  where status = 'published';

create index if not exists partners_published_idx
  on public.partners (tier, sort_order)
  where status = 'published';

create index if not exists winners_published_idx
  on public.winners (year desc, is_grand_prix desc, place)
  where status = 'published';

-- The homepage asks for "the next few events from now"; a plain ascending index
-- on starts_at serves it as a forward range scan.
create index if not exists events_upcoming_idx
  on public.events (starts_at)
  where status = 'published';

-- -----------------------------------------------------------------------------
-- Foreign keys
-- -----------------------------------------------------------------------------
-- Postgres does NOT index the referencing side of a foreign key automatically.
-- Without these, deleting a parent row forces a sequential scan of every child
-- table to enforce the constraint.
create index if not exists photos_album_idx        on public.photos (album_id, sort_order);
create index if not exists districts_region_idx    on public.districts (region_id, sort_order);
create index if not exists news_author_idx         on public.news (author_id);
create index if not exists winners_category_idx    on public.winners (category_id);
create index if not exists registrations_nomination_idx on public.registrations (nomination_id);
create index if not exists registrations_reviewer_idx  on public.registrations (reviewed_by);

-- -----------------------------------------------------------------------------
-- Translation lookups
-- -----------------------------------------------------------------------------
-- The UNIQUE (parent_id, locale) constraints already index parent-first lookups,
-- which is the access pattern for "give me this article in Russian". These
-- locale-first indexes serve the opposite direction, used by the admin
-- translation-coverage report.
create index if not exists news_translations_locale_idx    on public.news_translations (locale);
create index if not exists judge_translations_locale_idx   on public.judge_translations (locale);
create index if not exists album_translations_locale_idx   on public.album_translations (locale);
create index if not exists video_translations_locale_idx   on public.video_translations (locale);
create index if not exists winner_translations_locale_idx  on public.winner_translations (locale);
create index if not exists partner_translations_locale_idx on public.partner_translations (locale);
create index if not exists page_translations_locale_idx    on public.page_translations (locale);
create index if not exists event_translations_locale_idx   on public.event_translations (locale);
create index if not exists photo_translations_photo_idx    on public.photo_translations (photo_id);

-- -----------------------------------------------------------------------------
-- Admin review queue
-- -----------------------------------------------------------------------------
create index if not exists registrations_status_created_idx
  on public.registrations (status, created_at desc);

create index if not exists registrations_created_idx
  on public.registrations (created_at desc);

create index if not exists contact_messages_unread_idx
  on public.contact_messages (created_at desc)
  where not is_read and not is_archived;

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_entity_idx  on public.audit_logs (entity, entity_id);

-- -----------------------------------------------------------------------------
-- Free-text search
-- -----------------------------------------------------------------------------
-- Trigram GIN indexes, not tsvector full-text search. Reasoning: the corpus is
-- trilingual, and Postgres ships no stemming dictionary for Uzbek at all. A
-- tsvector configured as 'simple' would degrade to exact-prefix matching, while
-- trigrams give real substring and typo tolerance in every language — which is
-- what an operator hunting for "Karimov" in a 5,000-row applicant list needs.
create index if not exists registrations_name_trgm_idx
  on public.registrations
  using gin ((first_name || ' ' || last_name) gin_trgm_ops);

create index if not exists registrations_email_trgm_idx
  on public.registrations using gin ((email::text) gin_trgm_ops);

create index if not exists registrations_phone_trgm_idx
  on public.registrations using gin (phone gin_trgm_ops);

create index if not exists registrations_reference_trgm_idx
  on public.registrations using gin (reference_code gin_trgm_ops);

create index if not exists news_translations_title_trgm_idx
  on public.news_translations using gin (title gin_trgm_ops);

create index if not exists judge_translations_name_trgm_idx
  on public.judge_translations using gin (full_name gin_trgm_ops);

create index if not exists winner_translations_name_trgm_idx
  on public.winner_translations using gin (full_name gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- Identity
-- -----------------------------------------------------------------------------
create index if not exists profiles_role_idx on public.profiles (role) where is_active;
create unique index if not exists profiles_email_key on public.profiles (email);

-- ==========================================================================
-- 0007_rls.sql
-- ==========================================================================

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

-- ==========================================================================
-- 0008_storage.sql
-- ==========================================================================

-- =============================================================================
-- 0008 — Storage buckets and object policies
-- =============================================================================
-- One bucket:
--
--   media         PUBLIC   — press photos, logos, gallery images. Served straight
--                            from the CDN; anything here is world-readable.
--
-- There is no `applications` bucket. An earlier draft had a private one for
-- participant portraits, passport scans and performance videos; the official
-- paper form asks for none of those, so the application form does not collect
-- them and there is nothing to store. Not provisioning the bucket at all is
-- better than provisioning an empty one: an unused private bucket is a place
-- where someone later drops a file that nobody has decided the policy for.
--
-- SVG IS DELIBERATELY NOT AN ALLOWED TYPE. An SVG is an executable document: it
-- can carry <script>, and Supabase serves it inline. Even though that script
-- would run on the storage origin rather than romansiada.uz, it is a ready-made
-- phishing and token-harvesting surface hosted under the project's own domain.
-- Partner logos are therefore uploaded as PNG or WebP.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Object policies
-- -----------------------------------------------------------------------------
drop policy if exists media_public_read       on storage.objects;
drop policy if exists media_editor_write      on storage.objects;
drop policy if exists media_editor_update     on storage.objects;
drop policy if exists media_editor_delete     on storage.objects;
drop policy if exists applications_staff_read on storage.objects;
drop policy if exists applications_admin_delete on storage.objects;

-- media -----------------------------------------------------------------------
create policy media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

create policy media_editor_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.can_manage_content());

create policy media_editor_update on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.can_manage_content())
  with check (bucket_id = 'media' and public.can_manage_content());

create policy media_editor_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.can_manage_content());

-- The `applications_*` policies are dropped above and not recreated. Leaving the
-- DROPs in place matters: they clean up an environment where an earlier version
-- of this migration already ran.

-- ==========================================================================
-- 0009_grants.sql
-- ==========================================================================

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

-- ==========================================================================
-- 0010_nominations_rls.sql
-- ==========================================================================

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

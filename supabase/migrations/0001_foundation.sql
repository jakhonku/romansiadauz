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

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

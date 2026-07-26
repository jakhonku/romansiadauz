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

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

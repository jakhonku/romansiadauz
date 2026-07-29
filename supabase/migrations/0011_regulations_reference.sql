-- =============================================================================
-- 0011 — Reference lists aligned with the approved Regulations
-- =============================================================================
-- Source of truth: «ПОЛОЖЕНИЕ I Международного конкурса молодых исполнителей
-- русского и узбекского романса "Узбекская Романсиада"», § IV.
--
-- The values seeded in 0002 were pre-launch placeholders written before the
-- document existed: four age groups (10–15 / 16–20 / 21–28 / 29–45) and five
-- nominations. The document defines three age categories and exactly two
-- creative directions, and an application form that offers anything else lets a
-- competitor enter a category the jury does not judge.
--
-- Nothing is deleted. `registrations.nomination_id` is ON DELETE RESTRICT, so a
-- nomination already chosen by an applicant cannot be removed without taking
-- their application with it; the retired rows are deactivated instead, which is
-- what every read filters on. The same treatment is given to the age groups for
-- symmetry — a historical row is evidence of what was offered at the time.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Nominations — § IV, "два творческих направления"
-- -----------------------------------------------------------------------------
insert into public.nominations (code, name_uz, name_ru, name_en, sort_order, is_active) values
  ('russian-romance', 'Rus romansi',     'Русский романс',   'Russian romance', 1, true),
  ('uzbek-romance',   'O''zbek romansi', 'Узбекский романс', 'Uzbek romance',   2, true)
on conflict (code) do update
  set name_uz    = excluded.name_uz,
      name_ru    = excluded.name_ru,
      name_en    = excluded.name_en,
      sort_order = excluded.sort_order,
      is_active  = true;

update public.nominations
   set is_active = false
 where code not in ('russian-romance', 'uzbek-romance');

-- -----------------------------------------------------------------------------
-- Age categories — § IV, "следующие возрастные категории"
-- -----------------------------------------------------------------------------
-- Two columns the document does not speak to:
--
--   min_age for «Романс без границ». The document sets only a ceiling ("не
--   старше 35 лет"). The CHECK constraint needs a floor, so it carries 12 — the
--   competition's own youngest admissible age, from the first category. It is a
--   storage requirement, not a rule: nothing renders it.
--
--   duration_minutes / pieces_count. The document prescribes no stage time and
--   no per-category piece count — it says the auditions run in three rounds with
--   one romance in each. The columns keep their table defaults and nothing reads
--   them any more; the Regulations page now renders the document's own text
--   rather than a card grid of numbers nobody approved.
-- -----------------------------------------------------------------------------
insert into public.age_categories
  (code, name_uz, name_ru, name_en, min_age, max_age, sort_order, is_active) values
  ('hope',       'Romansiada umidi',  'Надежда Романсиады', 'Hope of Romansiada',      12, 17, 1, true),
  ('young',      'Yosh ijrochilar',   'Молодые исполнители', 'Young performers',       18, 27, 2, true),
  ('no-borders', 'Chegarasiz romans', 'Романс без границ',  'Romance without borders', 12, 35, 3, true)
on conflict (code) do update
  set name_uz    = excluded.name_uz,
      name_ru    = excluded.name_ru,
      name_en    = excluded.name_en,
      min_age    = excluded.min_age,
      max_age    = excluded.max_age,
      sort_order = excluded.sort_order,
      is_active  = true;

update public.age_categories
   set is_active = false
 where code not in ('hope', 'young', 'no-borders');

comment on column public.age_categories.duration_minutes is
  'Not defined by the Regulations. Retained with its default; no page renders it.';

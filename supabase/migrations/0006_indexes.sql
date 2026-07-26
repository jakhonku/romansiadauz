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

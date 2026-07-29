-- =============================================================================
-- 0012 — `scores` bucket: sheet music for the competition repertoire
-- =============================================================================
-- The recommended repertoire of Uzbek romances is published as PDF scores that
-- competitors download and rehearse from. They do not belong in `media`: that
-- bucket accepts images only and caps objects at 10 MB, while a scanned score
-- runs to 25 MB. Widening `media` to admit PDFs would also widen it for every
-- editorial upload, which is the opposite of what its allow-list is for.
--
-- Public, like `media`. A score is reference material handed to anyone who
-- intends to enter; putting it behind a signed URL would mean minting one per
-- visitor for a file that is already meant to be public.
--
-- PDF ONLY. A PDF is not inert either — it can carry JavaScript, and browsers
-- render it in a viewer that has historically had holes. The narrow allow-list
-- is what keeps this from becoming a general file drop: an HTML or SVG object
-- served from the project's own storage origin is a phishing surface, which is
-- the same reasoning written out at the top of 0008.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'scores',
  'scores',
  true,
  52428800, -- 50 MB; the largest supplied score is ~25 MB
  array['application/pdf']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Object policies — same shape as `media`
-- -----------------------------------------------------------------------------
drop policy if exists scores_public_read   on storage.objects;
drop policy if exists scores_editor_write  on storage.objects;
drop policy if exists scores_editor_update on storage.objects;
drop policy if exists scores_editor_delete on storage.objects;

create policy scores_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'scores');

create policy scores_editor_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'scores' and public.can_manage_content());

create policy scores_editor_update on storage.objects
  for update to authenticated
  using (bucket_id = 'scores' and public.can_manage_content())
  with check (bucket_id = 'scores' and public.can_manage_content());

create policy scores_editor_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'scores' and public.can_manage_content());

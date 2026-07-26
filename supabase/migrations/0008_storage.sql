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

alter table public.creator_submissions
  add column if not exists experience jsonb not null default '{}'::jsonb;

alter table public.creator_publications
  add column if not exists experience jsonb not null default '{}'::jsonb;

alter table public.documents
  add column if not exists creator_experience jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'creator-media',
  'creator-media',
  false,
  26214400,
  array[
    'image/jpeg','image/png','image/webp',
    'audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Creators upload own media" on storage.objects;
create policy "Creators upload own media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'creator-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.kin_creators kc
    where kc.user_id = (select auth.uid()) and kc.active = true
  )
);

drop policy if exists "Creators read own media" on storage.objects;
create policy "Creators read own media"
on storage.objects for select
to authenticated
using (
  bucket_id = 'creator-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.kin_creators kc
    where kc.user_id = (select auth.uid()) and kc.active = true
  )
);

drop policy if exists "Creators update own media" on storage.objects;
create policy "Creators update own media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'creator-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'creator-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Creators delete own media" on storage.objects;
create policy "Creators delete own media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'creator-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

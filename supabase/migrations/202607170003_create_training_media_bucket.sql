insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'training-media',
  'training-media',
  true,
  10485760,
  array['video/mp4', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read training media" on storage.objects;

create policy "Public read training media"
on storage.objects
for select
to public
using (bucket_id = 'training-media');

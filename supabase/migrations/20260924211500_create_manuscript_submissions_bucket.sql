-- Private storage for First Book manuscript uploads.
-- Files are uploaded through short-lived signed upload URLs created server-side.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'manuscript-submissions',
  'manuscript-submissions',
  false,
  52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/rtf',
    'text/rtf',
    'text/plain',
    'application/epub+zip',
    'application/octet-stream'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

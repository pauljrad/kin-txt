alter table public.creator_submissions add column if not exists review_notes text not null default '';
comment on column public.creator_submissions.review_notes is 'Private editorial notes, available only through the private review credential; never copied into publications.';

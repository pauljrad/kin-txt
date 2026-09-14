create table public.kin_creators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kin_creators enable row level security;
revoke all on table public.kin_creators from public, anon, authenticated;
grant select on table public.kin_creators to authenticated;
grant select, insert, update, delete on table public.kin_creators to service_role;

create policy "Creators can read their own entitlement"
on public.kin_creators
for select
to authenticated
using ((select auth.uid()) = user_id and active = true);

create table public.creator_submissions (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references auth.users(id) on delete cascade,
  creator_name text not null,
  creator_email text not null,
  content_type text not null check (content_type in ('essay', 'story', 'news', 'article', 'other')),
  title text not null,
  body text not null,
  word_count integer not null default 0 check (word_count >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approval_token_hash text unique,
  notification_status text not null default 'pending' check (notification_status in ('pending', 'sent', 'failed')),
  resend_email_id text,
  last_error text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.creator_submissions enable row level security;
revoke all on table public.creator_submissions from public, anon, authenticated;
grant select, insert, update, delete on table public.creator_submissions to service_role;

create index creator_submissions_creator_idx on public.creator_submissions (creator_user_id, submitted_at desc);
create index creator_submissions_status_idx on public.creator_submissions (status, submitted_at desc);

create table public.creator_publications (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.creator_submissions(id) on delete restrict,
  creator_user_id uuid not null references auth.users(id) on delete restrict,
  creator_name text not null,
  content_type text not null check (content_type in ('essay', 'story', 'news', 'article', 'other')),
  title text not null,
  body text not null,
  word_count integer not null default 0 check (word_count >= 0),
  published_at timestamptz not null default now()
);

alter table public.creator_publications enable row level security;
revoke all on table public.creator_publications from public, anon, authenticated;
grant select on table public.creator_publications to anon, authenticated;
grant select, insert, update, delete on table public.creator_publications to service_role;

create policy "Published Creator TXTs are readable"
on public.creator_publications
for select
to anon, authenticated
using (published_at is not null);

create index creator_publications_published_idx on public.creator_publications (published_at desc);
create index creator_publications_creator_idx on public.creator_publications (creator_user_id, published_at desc);

comment on table public.kin_creators is 'Server-managed KiN-Creator entitlement; users may only read their own active entitlement.';
comment on table public.creator_submissions is 'Private KiN-Creator drafts awaiting one-time approval review.';
comment on table public.creator_publications is 'Approved KiN-Creator TXTs exposed read-only to the Journal feed.';

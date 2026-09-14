create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  submission_type text not null
    check (submission_type in ('writer', 'first_book')),
  entry_method text not null
    check (entry_method in ('writer_form', 'pro_free', 'paid')),
  payment_status text not null default 'not_required'
    check (payment_status in ('not_required', 'pending', 'paid', 'failed', 'cancelled', 'refunded')),
  email_status text not null default 'pending'
    check (email_status in ('pending', 'sent', 'failed')),
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  email text not null,
  links text,
  book_title text,
  genre text,
  word_count text,
  manuscript_link text,
  pitch text not null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  resend_email_id text,
  notification_attempts integer not null default 0
    check (notification_attempts >= 0),
  last_notification_attempt_at timestamptz,
  last_error text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.submissions enable row level security;

-- Submission content can include unpublished manuscripts and personal data.
-- Keep it out of the browser-facing Data API; Edge Functions use service_role.
revoke all on table public.submissions from public, anon, authenticated;
grant select, insert, update, delete on table public.submissions to service_role;

create index submissions_created_at_idx
  on public.submissions (created_at desc);
create index submissions_payment_status_idx
  on public.submissions (payment_status, created_at desc);
create index submissions_email_status_idx
  on public.submissions (email_status, created_at desc);

comment on table public.submissions is
  'Durable source of truth for KiN-TXT writer and First Book submissions; server-only.';

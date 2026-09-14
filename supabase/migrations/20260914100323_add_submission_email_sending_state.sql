alter table public.submissions
  drop constraint submissions_email_status_check;

alter table public.submissions
  add constraint submissions_email_status_check
  check (email_status in ('pending', 'sending', 'sent', 'failed'));

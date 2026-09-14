create index submissions_user_id_idx
  on public.submissions (user_id)
  where user_id is not null;

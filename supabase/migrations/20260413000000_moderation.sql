-- Moderation for user-generated / social KiN features (App Store Guideline 1.2).
-- Adds user blocking and content/user reporting so abusive users can be blocked
-- and objectionable content/users can be reported.

-- ── Blocks ───────────────────────────────────────────────────────────────────
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

alter table public.user_blocks enable row level security;

create policy "user_blocks_select_own" on public.user_blocks
  for select using (auth.uid() = blocker_id);
create policy "user_blocks_insert_own" on public.user_blocks
  for insert with check (auth.uid() = blocker_id);
create policy "user_blocks_delete_own" on public.user_blocks
  for delete using (auth.uid() = blocker_id);

-- ── Reports ──────────────────────────────────────────────────────────────────
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  item_type text not null default 'profile',   -- profile | shared_item | club | message
  item_id text,
  reason text not null,                          -- spam | harassment | inappropriate | other
  details text,
  status text not null default 'open',           -- open | reviewed | actioned | dismissed
  created_at timestamptz not null default now()
);

alter table public.content_reports enable row level security;

-- Users may file reports and read back only their own; review happens out-of-band
-- (e.g. via the service role in the dashboard) within 24h.
create policy "content_reports_insert_own" on public.content_reports
  for insert with check (auth.uid() = reporter_id);
create policy "content_reports_select_own" on public.content_reports
  for select using (auth.uid() = reporter_id);

create index if not exists content_reports_status_idx on public.content_reports (status, created_at desc);

-- Create subscriptions table
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'lifetime',
  -- 'trialing' | 'active' | 'canceled' | 'past_due' | 'lifetime'
  plan text not null default 'lifetime',
  -- 'monthly' | 'annual' | 'lifetime'
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- Enable Row Level Security
alter table public.subscriptions enable row level security;

-- Users can only read their own subscription
create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Only service role can insert/update (webhooks use service role key)
create policy "Service role can manage subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role');

-- Index for fast stripe lookups
create index if not exists subscriptions_stripe_customer_id_idx
  on public.subscriptions(stripe_customer_id);

create index if not exists subscriptions_user_id_idx
  on public.subscriptions(user_id);

-- GRANDFATHER ALL EXISTING USERS:
-- Insert a 'lifetime' subscription for every user who already has an account.
-- This ensures no existing user loses access when the paywall goes live.
-- Users added after this migration will NOT be grandfathered automatically.
insert into public.subscriptions (user_id, status, plan)
select 
  id as user_id,
  'lifetime' as status,
  'lifetime' as plan
from auth.users
on conflict (user_id) do nothing;

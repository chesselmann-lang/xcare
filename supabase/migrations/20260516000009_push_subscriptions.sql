-- S322: Web Push subscriptions table
-- Stores PushSubscription JSON per profile (one row per browser/device)

create table if not exists push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  endpoint      text not null,
  p256dh        text not null,   -- browser public key (base64url)
  auth          text not null,   -- auth secret (base64url)
  created_at    timestamptz not null default now(),
  -- one subscription per endpoint per profile
  unique (profile_id, endpoint)
);

-- pending push notifications queue (read by service worker)
create table if not exists push_queue (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  titel       text not null,
  nachricht   text not null,
  link        text,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- Index for fetching unsent notifications per profile
create index if not exists idx_push_queue_profile_unsent
  on push_queue (profile_id, created_at desc)
  where sent_at is null;

-- RLS: profiles can only read/write their own subscriptions
alter table push_subscriptions enable row level security;
alter table push_queue enable row level security;

create policy "push_subscriptions_own" on push_subscriptions
  using (profile_id = (
    select id from profiles where user_id = auth.uid()
  ));

create policy "push_subscriptions_insert_own" on push_subscriptions
  for insert with check (profile_id = (
    select id from profiles where user_id = auth.uid()
  ));

create policy "push_subscriptions_delete_own" on push_subscriptions
  for delete using (profile_id = (
    select id from profiles where user_id = auth.uid()
  ));

-- push_queue: only readable by the owning profile (service worker fetches via auth)
create policy "push_queue_own" on push_queue
  using (profile_id = (
    select id from profiles where user_id = auth.uid()
  ));

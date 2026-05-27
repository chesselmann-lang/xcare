create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  key_prefix text not null,     -- First 16 chars for display: "xc_live_abc12345"
  key_hash text not null unique, -- SHA-256 of full key
  key_hint text not null,        -- last 4 chars for identification

  -- Permissions
  scopes text[] default '{read}' check (
    scopes <@ ARRAY['read','write','admin','webhooks']::text[]
  ),

  -- Rate limiting
  rate_limit_per_minute integer default 60,
  rate_limit_per_day integer default 10000,

  -- Usage tracking
  last_used_at timestamptz,
  total_requests bigint default 0,

  -- Status
  is_active boolean default true,
  expires_at timestamptz,

  created_at timestamptz default now()
);

create table if not exists public.api_webhooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  url text not null,
  secret text not null,           -- For HMAC signing
  events text[] not null,         -- Which events to send

  is_active boolean default true,
  last_triggered_at timestamptz,
  failure_count integer default 0,

  created_at timestamptz default now()
);

alter table public.api_keys enable row level security;
alter table public.api_webhooks enable row level security;

create policy "Nutzer verwaltet API Keys" on public.api_keys for all using (user_id = auth.uid());
create policy "Nutzer verwaltet Webhooks" on public.api_webhooks for all using (user_id = auth.uid());

create index api_keys_hash_idx on public.api_keys(key_hash) where is_active = true;
create index api_keys_user_idx on public.api_keys(user_id);

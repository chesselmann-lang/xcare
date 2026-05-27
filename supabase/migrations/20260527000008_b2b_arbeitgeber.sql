-- B2B: Arbeitgeber-Unternehmen
create table if not exists public.unternehmen (
  id uuid primary key default gen_random_uuid(),

  -- Firma
  name text not null,
  rechtsform text,
  handelsregister text,
  ust_id text,

  -- Kontakt
  ansprechpartner_name text,
  ansprechpartner_email text,
  ansprechpartner_telefon text,
  website text,

  -- Adresse
  strasse text,
  plz text,
  ort text,

  -- Subscription
  stripe_customer_id text unique,
  subscription_plan text default 'starter' check (subscription_plan in ('starter', 'business', 'enterprise')),
  subscription_status text default 'trial' check (subscription_status in ('trial', 'aktiv', 'pausiert', 'gekuendigt')),
  trial_ends_at timestamptz default (now() + interval '30 days'),

  -- Limits
  max_mitarbeiter integer default 10,
  aktive_mitarbeiter integer default 0,

  -- Admin user
  admin_user_id uuid references auth.users(id),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- B2B: Mitarbeiter-Einladungen
create table if not exists public.mitarbeiter_einladungen (
  id uuid primary key default gen_random_uuid(),
  unternehmen_id uuid not null references public.unternehmen(id) on delete cascade,
  eingeladen_von uuid not null references auth.users(id),

  email text not null,
  name text,

  -- Token fuer Einladungslink
  token text not null unique default encode(gen_random_bytes(32), 'hex'),

  status text default 'ausstehend' check (status in ('ausstehend', 'angenommen', 'abgelaufen')),
  expires_at timestamptz default (now() + interval '7 days'),

  created_at timestamptz default now()
);

-- B2B: Mitarbeiter-Zugehoerigkeit
create table if not exists public.unternehmen_mitarbeiter (
  id uuid primary key default gen_random_uuid(),
  unternehmen_id uuid not null references public.unternehmen(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  eingeladen_via uuid references public.mitarbeiter_einladungen(id),

  rolle text default 'mitarbeiter' check (rolle in ('admin', 'hr', 'mitarbeiter')),
  status text default 'aktiv' check (status in ('aktiv', 'deaktiviert')),

  beigetreten_am timestamptz default now(),

  unique(unternehmen_id, user_id)
);

alter table public.unternehmen enable row level security;
alter table public.mitarbeiter_einladungen enable row level security;
alter table public.unternehmen_mitarbeiter enable row level security;

-- Admins see/edit their company
create policy "Unternehmen Admin" on public.unternehmen
  for all using (admin_user_id = auth.uid());

-- Mitarbeiter sehen ihr Unternehmen
create policy "Mitarbeiter sieht Unternehmen" on public.unternehmen
  for select using (
    id in (select unternehmen_id from public.unternehmen_mitarbeiter where user_id = auth.uid())
  );

create policy "Admin verwaltet Einladungen" on public.mitarbeiter_einladungen
  for all using (
    unternehmen_id in (select id from public.unternehmen where admin_user_id = auth.uid())
  );

create policy "Mitarbeiter sieht sich selbst" on public.unternehmen_mitarbeiter
  for select using (user_id = auth.uid());

create policy "Admin verwaltet Mitarbeiter" on public.unternehmen_mitarbeiter
  for all using (
    unternehmen_id in (select id from public.unternehmen where admin_user_id = auth.uid())
  );

create index unternehmen_admin_idx on public.unternehmen(admin_user_id);
create index mitarbeiter_unternehmen_idx on public.unternehmen_mitarbeiter(unternehmen_id);
create index mitarbeiter_user_idx on public.unternehmen_mitarbeiter(user_id);

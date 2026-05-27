-- Anbieter-Verfügbarkeit für Realtime-Matching
create table if not exists public.anbieter_verfuegbarkeit (
  id uuid primary key default gen_random_uuid(),
  anbieter_id uuid not null references auth.users(id) on delete cascade,

  -- Zeitslot
  datum date not null,
  zeit_von time not null,
  zeit_bis time not null,

  -- Status
  status text not null default 'frei' check (status in ('frei', 'reserviert', 'gebucht', 'gesperrt')),

  -- Kapazität
  max_klienten smallint default 1,
  aktuelle_klienten smallint default 0,

  -- Stundensatz
  stundensatz numeric(6,2),

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint no_overlap unique (anbieter_id, datum, zeit_von)
);

-- Buchungen
create table if not exists public.buchungen (
  id uuid primary key default gen_random_uuid(),

  -- Parteien
  familie_user_id uuid not null references auth.users(id) on delete cascade,
  anbieter_id uuid not null references auth.users(id) on delete cascade,
  verfuegbarkeit_id uuid references public.anbieter_verfuegbarkeit(id) on delete set null,

  -- Buchungsdetails
  datum date not null,
  zeit_von time not null,
  zeit_bis time not null,
  stunden numeric(4,2) generated always as (
    extract(epoch from (zeit_bis::time - zeit_von::time)) / 3600
  ) stored,

  -- Leistungsart
  leistungsart text not null check (leistungsart in (
    'grundpflege', 'behandlungspflege', 'hauswirtschaft',
    'begleitung', 'betreuung', 'nachtpflege', 'verhinderungspflege'
  )),

  -- Preise
  stundensatz numeric(6,2) not null,
  gesamtbetrag numeric(10,2) generated always as (
    stunden * stundensatz
  ) stored,

  -- Status & Zahlung
  status text not null default 'angefragt' check (status in (
    'angefragt', 'bestaetigt', 'abgeschlossen', 'storniert', 'streit'
  )),
  stripe_payment_intent_id text,
  bezahlt_am timestamptz,

  -- Notizen
  notizen text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.anbieter_verfuegbarkeit enable row level security;
alter table public.buchungen enable row level security;

-- Verfügbarkeit: Anbieter verwalten ihre eigenen Slots
create policy "Anbieter verwaltet eigene Verfuegbarkeit" on public.anbieter_verfuegbarkeit
  for all using (anbieter_id = auth.uid());

-- Verfügbarkeit: Familien können freie Slots lesen
create policy "Familie sieht freie Slots" on public.anbieter_verfuegbarkeit
  for select using (status in ('frei', 'reserviert'));

-- Buchungen: Beide Parteien sehen ihre Buchungen
create policy "Buchung sichtbar fuer Beteiligte" on public.buchungen
  for select using (
    familie_user_id = auth.uid() or anbieter_id = auth.uid()
  );

create policy "Familie erstellt Buchung" on public.buchungen
  for insert with check (familie_user_id = auth.uid());

create policy "Anbieter bestaetigt Buchung" on public.buchungen
  for update using (anbieter_id = auth.uid());

-- Indexes
create index buchungen_familie_idx on public.buchungen(familie_user_id);
create index buchungen_anbieter_idx on public.buchungen(anbieter_id);
create index buchungen_datum_idx on public.buchungen(datum);
create index verfuegbarkeit_anbieter_datum_idx on public.anbieter_verfuegbarkeit(anbieter_id, datum);
create index verfuegbarkeit_status_datum_idx on public.anbieter_verfuegbarkeit(status, datum);

-- Enable Realtime for live availability updates
alter publication supabase_realtime add table public.anbieter_verfuegbarkeit;
alter publication supabase_realtime add table public.buchungen;

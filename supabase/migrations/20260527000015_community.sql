-- Nachbarschaftshilfe-Posts
create table if not exists public.community_hilfe (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references auth.users(id) on delete cascade,

  typ text not null check (typ in ('suche', 'biete')),
  kategorie text not null check (kategorie in (
    'einkaufen', 'fahrdienst', 'gesellschaft', 'gartenarbeit',
    'kochen', 'handwerk', 'haustiere', 'sonstiges'
  )),

  titel text not null,
  beschreibung text,
  plz text,
  zeitraum text,     -- "Montags 14-16 Uhr" etc.

  kontakt_email text,
  kontakt_telefon text,

  aktiv boolean default true,

  created_at timestamptz default now()
);

-- Telemonitoring: Gerätedaten-Import
create table if not exists public.telemonitoring_daten (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  geraet_typ text not null check (geraet_typ in (
    'blutdruckmessgeraet', 'blutzuckermessgeraet', 'waage',
    'pulsoximeter', 'ekg', 'schlaftracker', 'aktivitaetstracker'
  )),
  geraet_hersteller text,
  geraet_id text,

  -- HL7 FHIR Observation
  fhir_resource_type text default 'Observation',
  fhir_code text,
  wert numeric(10,4),
  einheit text,
  gemessen_am timestamptz not null,

  -- Roh-Daten für spätere Verarbeitung
  roh_daten jsonb,

  quelle text default 'manuell' check (quelle in ('manuell', 'fhir', 'bluetooth', 'api', 'csv_import')),

  created_at timestamptz default now()
);

alter table public.community_hilfe enable row level security;
alter table public.telemonitoring_daten enable row level security;

create policy "Community Posts sichtbar" on public.community_hilfe for select using (aktiv = true);
create policy "Autor verwaltet Post" on public.community_hilfe for all using (autor_id = auth.uid());
create policy "Nutzer verwaltet Telemonitoring" on public.telemonitoring_daten for all using (user_id = auth.uid());

create index community_plz_idx on public.community_hilfe(plz, typ, aktiv);
create index telemonitoring_user_datum_idx on public.telemonitoring_daten(user_id, gemessen_am desc);

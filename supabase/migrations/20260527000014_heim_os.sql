create table if not exists public.einrichtungen (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  typ text not null check (typ in ('pflegeheim', 'betreutes_wohnen', 'tagespflege', 'kurzzeitpflege')),

  strasse text,
  plz text,
  ort text,

  -- Kapazität
  max_plaetze smallint not null default 30,
  belegte_plaetze smallint default 0,

  -- Admin
  leiter_user_id uuid references auth.users(id),

  -- Zertifizierungen
  mdk_note numeric(2,1) check (mdk_note between 1 and 5),
  letzte_pruefung date,

  created_at timestamptz default now()
);

create table if not exists public.bewohner (
  id uuid primary key default gen_random_uuid(),
  einrichtung_id uuid not null references public.einrichtungen(id) on delete cascade,

  -- Stammdaten
  vorname text not null,
  nachname text not null,
  geburtsdatum date,
  pflegegrad smallint check (pflegegrad between 1 and 5),

  -- Aufenthalt
  einzug_am date,
  zimmer_nummer text,
  status text default 'aktiv' check (status in ('aktiv', 'krank', 'krankenhaus', 'verstorben', 'ausgezogen')),

  -- Betreuung
  bezugspfleger_id uuid references auth.users(id),

  created_at timestamptz default now()
);

create table if not exists public.dienstplan (
  id uuid primary key default gen_random_uuid(),
  einrichtung_id uuid not null references public.einrichtungen(id) on delete cascade,
  mitarbeiter_id uuid not null references auth.users(id),

  datum date not null,
  schicht text not null check (schicht in ('frueh', 'spaet', 'nacht', 'bereitschaft')),

  geplant_von time,
  geplant_bis time,
  tatsaechlich_von time,
  tatsaechlich_bis time,

  status text default 'geplant' check (status in ('geplant', 'bestaetigt', 'abwesend', 'vertreter'))
);

alter table public.einrichtungen enable row level security;
alter table public.bewohner enable row level security;
alter table public.dienstplan enable row level security;

create policy "Einrichtung Admin" on public.einrichtungen for all using (leiter_user_id = auth.uid());
create policy "Mitarbeiter sieht Einrichtung" on public.einrichtungen for select using (
  id in (select einrichtung_id from public.dienstplan where mitarbeiter_id = auth.uid())
);
create policy "Bewohner-Zugang fuer Mitarbeiter" on public.bewohner for select using (auth.uid() is not null);
create policy "Dienstplan Zugang" on public.dienstplan for all using (
  einrichtung_id in (select id from public.einrichtungen where leiter_user_id = auth.uid())
  or mitarbeiter_id = auth.uid()
);

create index bewohner_einrichtung_idx on public.bewohner(einrichtung_id, status);
create index dienstplan_datum_idx on public.dienstplan(einrichtung_id, datum);

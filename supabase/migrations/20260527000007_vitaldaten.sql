-- ============================================================
-- Migration: Vitaldaten-Tracking & KI-Frühwarnungen
-- Feature F6 — Predictive Deterioration AI
-- ============================================================

-- Vitaldaten-Tracking
create table if not exists public.vitaldaten (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pflegebeduerftige_id uuid,

  -- Gemessene Werte
  typ text not null check (typ in (
    'blutdruck_systolisch', 'blutdruck_diastolisch',
    'puls', 'temperatur', 'gewicht', 'blutzucker',
    'sauerstoffsaettigung', 'atemfrequenz', 'schmerz_score',
    'mobilitaet_score', 'stimmung_score', 'schlaf_stunden'
  )),
  wert numeric(8,2) not null,
  einheit text,

  -- Kontext
  gemessen_am timestamptz not null default now(),
  notizen text,
  gemessen_von text default 'selbst' check (gemessen_von in ('selbst', 'angehoerige', 'anbieter', 'arzt', 'geraet')),

  created_at timestamptz default now()
);

-- KI-Frühwarnungen
create table if not exists public.fruehwarnungen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Warnung
  schweregrad text not null default 'niedrig' check (schweregrad in ('niedrig', 'mittel', 'hoch', 'kritisch')),
  kategorie text not null check (kategorie in (
    'vitalwerte', 'mobilitat', 'ernaehrung', 'kognition',
    'soziale_isolation', 'medikamente', 'sturzrisiko'
  )),
  titel text not null,
  beschreibung text not null,
  ki_analyse text,
  empfohlene_massnahmen jsonb, -- Array of strings

  -- Status
  gelesen boolean default false,
  bearbeitet boolean default false,

  -- Datenbasis
  analysierte_tage smallint,

  created_at timestamptz default now()
);

alter table public.vitaldaten enable row level security;
alter table public.fruehwarnungen enable row level security;

create policy "Nutzer verwaltet Vitaldaten" on public.vitaldaten for all using (user_id = auth.uid());
create policy "Nutzer sieht Fruehwarnungen" on public.fruehwarnungen for all using (user_id = auth.uid());

create index vitaldaten_user_typ_idx on public.vitaldaten(user_id, typ, gemessen_am desc);
create index fruehwarnungen_user_unread_idx on public.fruehwarnungen(user_id, gelesen);

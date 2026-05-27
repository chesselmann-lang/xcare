create table if not exists public.video_termine (
  id uuid primary key default gen_random_uuid(),

  -- Parteien
  gastgeber_id uuid not null references auth.users(id) on delete cascade,
  teilnehmer_ids uuid[] not null default '{}',

  -- Daily.co Room
  daily_room_name text,
  daily_room_url text,

  -- Zeitplanung
  geplant_fuer timestamptz not null,
  dauer_minuten smallint default 30,

  -- Typ
  typ text not null default 'beratung' check (typ in (
    'beratung', 'pflegeplanung', 'arzt_briefing', 'familienkonferenz', 'notfall'
  )),

  -- Status
  status text not null default 'geplant' check (status in (
    'geplant', 'laufend', 'beendet', 'abgesagt'
  )),

  -- Aufzeichnung
  recording_url text,
  transkript text,

  -- Notizen
  betreff text,
  agenda text,
  zusammenfassung text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.video_termine enable row level security;

create policy "Beteiligter sieht VideoTermin" on public.video_termine
  for select using (
    gastgeber_id = auth.uid() or auth.uid() = any(teilnehmer_ids)
  );
create policy "Gastgeber verwaltet VideoTermin" on public.video_termine
  for all using (gastgeber_id = auth.uid());

create index video_termine_gastgeber_idx on public.video_termine(gastgeber_id);
create index video_termine_geplant_idx on public.video_termine(geplant_fuer);

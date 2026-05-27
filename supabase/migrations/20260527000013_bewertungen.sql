create table if not exists public.bewertungen (
  id uuid primary key default gen_random_uuid(),

  buchung_id uuid unique references public.buchungen(id) on delete set null,
  bewerter_id uuid not null references auth.users(id) on delete cascade,
  anbieter_id uuid not null references auth.users(id) on delete cascade,

  -- Scores (1-5)
  gesamt_score numeric(3,2) generated always as (
    (zuverlaessigkeit + fachkompetenz + freundlichkeit + kommunikation + pünktlichkeit) / 5.0
  ) stored,
  zuverlaessigkeit smallint not null check (zuverlaessigkeit between 1 and 5),
  fachkompetenz smallint not null check (fachkompetenz between 1 and 5),
  freundlichkeit smallint not null check (freundlichkeit between 1 and 5),
  kommunikation smallint not null check (kommunikation between 1 and 5),
  pünktlichkeit smallint not null check (pünktlichkeit between 1 and 5),

  -- Freitext
  kommentar text check (char_length(kommentar) <= 1000),

  -- Verification
  verifiziert boolean generated always as (buchung_id is not null) stored,

  -- Anbieter-Antwort
  anbieter_antwort text,
  anbieter_antwort_am timestamptz,

  -- Moderation
  gemeldet boolean default false,
  sichtbar boolean default true,

  created_at timestamptz default now()
);

-- Aggregated score view per Anbieter
create view public.anbieter_scores as
select
  anbieter_id,
  round(avg(gesamt_score), 2) as durchschnitt,
  count(*) as anzahl_bewertungen,
  count(*) filter (where verifiziert) as verifizierte_bewertungen,
  round(avg(zuverlaessigkeit), 2) as avg_zuverlaessigkeit,
  round(avg(fachkompetenz), 2) as avg_fachkompetenz,
  round(avg(freundlichkeit), 2) as avg_freundlichkeit,
  round(avg(kommunikation), 2) as avg_kommunikation,
  round(avg(pünktlichkeit), 2) as avg_pünktlichkeit
from public.bewertungen
where sichtbar = true
group by anbieter_id;

alter table public.bewertungen enable row level security;
create policy "Jeder sieht sichtbare Bewertungen" on public.bewertungen for select using (sichtbar = true);
create policy "Bewerter verwaltet eigene Bewertung" on public.bewertungen for all using (bewerter_id = auth.uid());
create policy "Anbieter antwortet auf Bewertungen" on public.bewertungen for update using (anbieter_id = auth.uid());

create index bewertungen_anbieter_idx on public.bewertungen(anbieter_id, created_at desc);
create index bewertungen_buchung_idx on public.bewertungen(buchung_id);

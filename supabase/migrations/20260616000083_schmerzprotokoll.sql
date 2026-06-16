-- F83: Bewohner-Schmerzprotokoll (NRS-Skala + Verlauf)

create table if not exists schmerz_eintraege (
  id                    uuid primary key default gen_random_uuid(),
  bewohner_id           uuid not null references bewohner(id) on delete cascade,
  anbieter_id           uuid not null references anbieter(id) on delete cascade,
  datum                 date not null default current_date,
  uhrzeit               time,
  nrs_wert              smallint not null check (nrs_wert >= 0 and nrs_wert <= 10),
  lokalisation          text,                     -- Körperstelle
  schmerzart            text                       -- brennend, stechend, dumpf, ziehend, etc.
                          check (schmerzart is null or schmerzart in (
                            'brennend', 'stechend', 'dumpf', 'ziehend', 'klopfend', 'krampfartig', 'sonstig'
                          )),
  charakter             text,                     -- dauerhaft, wiederkehrend, gelegentlich
  ausstrahlung          text,
  beeintraechtigung     text,                     -- Schlaf, Bewegung, Stimmung etc.
  massnahmen            text,                     -- durchgeführte Maßnahmen
  wirksamkeit           smallint check (wirksamkeit is null or (wirksamkeit >= 0 and wirksamkeit <= 10)),
  medikament_gegeben    boolean not null default false,
  medikament_name       text,
  medikament_dosis      text,
  arzt_informiert       boolean not null default false,
  notizen               text,
  erfasst_von           uuid references auth.users(id),
  erstellt_am           timestamptz not null default now(),
  aktualisiert_am       timestamptz not null default now()
);

-- Schmerz-Assessments (regelmäßige strukturierte Bewertung)
create table if not exists schmerz_assessments (
  id                    uuid primary key default gen_random_uuid(),
  bewohner_id           uuid not null references bewohner(id) on delete cascade,
  anbieter_id           uuid not null references anbieter(id) on delete cascade,
  datum                 date not null default current_date,
  assessment_typ        text not null default 'NRS'
                          check (assessment_typ in ('NRS', 'BESD', 'DOLOPLUS')),
  gesamtwert            smallint,
  -- NRS-Verlaufsziele
  zielwert_nrs          smallint check (zielwert_nrs is null or (zielwert_nrs >= 0 and zielwert_nrs <= 10)),
  schmerz_diagnose      text,
  behandlungsplan       text,
  naechste_bewertung    date,
  erfasst_von           uuid references auth.users(id),
  erstellt_am           timestamptz not null default now()
);

-- RLS
alter table schmerz_eintraege enable row level security;
alter table schmerz_assessments enable row level security;

create policy "anbieter_schmerz_eintraege_select" on schmerz_eintraege
  using (anbieter_id in (
    select a.id from anbieter a join profiles p on p.id = a.profile_id where p.user_id = auth.uid()
  ));
create policy "anbieter_schmerz_eintraege_insert" on schmerz_eintraege for insert
  with check (anbieter_id in (
    select a.id from anbieter a join profiles p on p.id = a.profile_id where p.user_id = auth.uid()
  ));
create policy "anbieter_schmerz_eintraege_update" on schmerz_eintraege for update
  using (anbieter_id in (
    select a.id from anbieter a join profiles p on p.id = a.profile_id where p.user_id = auth.uid()
  ));
create policy "anbieter_schmerz_eintraege_delete" on schmerz_eintraege for delete
  using (anbieter_id in (
    select a.id from anbieter a join profiles p on p.id = a.profile_id where p.user_id = auth.uid()
  ));

create policy "anbieter_schmerz_assessments_select" on schmerz_assessments
  using (anbieter_id in (
    select a.id from anbieter a join profiles p on p.id = a.profile_id where p.user_id = auth.uid()
  ));
create policy "anbieter_schmerz_assessments_insert" on schmerz_assessments for insert
  with check (anbieter_id in (
    select a.id from anbieter a join profiles p on p.id = a.profile_id where p.user_id = auth.uid()
  ));

-- Indizes
create index if not exists idx_schmerz_eintraege_bewohner on schmerz_eintraege(bewohner_id, datum desc);
create index if not exists idx_schmerz_eintraege_anbieter on schmerz_eintraege(anbieter_id, datum desc);
create index if not exists idx_schmerz_assessments_bewohner on schmerz_assessments(bewohner_id, datum desc);

-- Trigger
create or replace function update_schmerz_updated_at()
returns trigger language plpgsql as $$
begin new.aktualisiert_am = now(); return new; end; $$;

create trigger trg_schmerz_eintraege_updated_at
  before update on schmerz_eintraege
  for each row execute function update_schmerz_updated_at();

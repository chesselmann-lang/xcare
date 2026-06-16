-- F81: Qualitätssicherungs-Dashboard

create table if not exists qualitaets_ziele (
  id              uuid primary key default gen_random_uuid(),
  anbieter_id     uuid not null references anbieter(id) on delete cascade,
  indikator       text not null,
  zielwert        numeric(8,2) not null,
  einheit         text not null default '%',
  beschreibung    text,
  aktiv           boolean not null default true,
  erstellt_am     timestamptz not null default now(),
  aktualisiert_am timestamptz not null default now(),
  unique (anbieter_id, indikator)
);

-- RLS
alter table qualitaets_ziele enable row level security;

create policy "anbieter_qualitaets_ziele" on qualitaets_ziele
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_qualitaets_ziele_insert" on qualitaets_ziele for insert
  with check (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_qualitaets_ziele_update" on qualitaets_ziele for update
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));

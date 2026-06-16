-- F80: Dekubitus-Risikoeinschätzung & Lagerungsplan

create table if not exists dekubitus_risiko (
  id                        uuid primary key default gen_random_uuid(),
  bewohner_id               uuid not null references bewohner(id) on delete cascade,
  anbieter_id               uuid not null references anbieter(id) on delete cascade,
  datum                     date not null default current_date,
  -- Braden-Skala Subskalen (1–4, außer reibung 1–3)
  sensorische_wahrnehmung   int not null check (sensorische_wahrnehmung between 1 and 4),
  feuchtigkeit              int not null check (feuchtigkeit between 1 and 4),
  aktivitaet                int not null check (aktivitaet between 1 and 4),
  mobilitaet                int not null check (mobilitaet between 1 and 4),
  ernaehrung                int not null check (ernaehrung between 1 and 4),
  reibung_scherkraefte      int not null check (reibung_scherkraefte between 1 and 3),
  braden_score              int not null, -- von App berechnet (6–23)
  risikostufe               text not null
    check (risikostufe in ('kein_risiko','maessig','hoch','sehr_hoch')),
  vorhandene_laesionen      text,
  hautbefund                text,
  massnahmen                text,
  naechste_einschaetzung    date,
  erfasst_von               uuid references auth.users(id),
  erstellt_am               timestamptz not null default now()
);

create table if not exists lagerungsplan (
  id              uuid primary key default gen_random_uuid(),
  bewohner_id     uuid not null references bewohner(id) on delete cascade,
  anbieter_id     uuid not null references anbieter(id) on delete cascade,
  intervall_min   int not null default 120,
  positionen      text[] not null default ARRAY['rueckenlage','rechts_30','links_30'],
  hilfsmittel     text,
  besonderheiten  text,
  aktiv           boolean not null default true,
  erstellt_von    uuid references auth.users(id),
  erstellt_am     timestamptz not null default now(),
  aktualisiert_am timestamptz not null default now(),
  unique (bewohner_id)
);

create table if not exists lagerungsprotokoll (
  id                  uuid primary key default gen_random_uuid(),
  bewohner_id         uuid not null references bewohner(id) on delete cascade,
  anbieter_id         uuid not null references anbieter(id) on delete cascade,
  datum               date not null default current_date,
  uhrzeit             time not null,
  position            text not null,
  hautinspektion      text
    check (hautinspektion in ('unauffaellig','roetung','offene_stelle','blasenbildung')),
  besonderheiten      text,
  naechste_lagerung   timestamptz,
  erfasst_von         uuid references auth.users(id),
  erstellt_am         timestamptz not null default now()
);

-- Indexes
create index if not exists idx_dekubitus_risiko_bewohner on dekubitus_risiko(bewohner_id);
create index if not exists idx_dekubitus_risiko_datum on dekubitus_risiko(datum);
create index if not exists idx_dekubitus_risiko_anbieter on dekubitus_risiko(anbieter_id);
create index if not exists idx_lagerungsplan_bewohner on lagerungsplan(bewohner_id);
create index if not exists idx_lagerungsprotokoll_bewohner on lagerungsprotokoll(bewohner_id);
create index if not exists idx_lagerungsprotokoll_datum on lagerungsprotokoll(datum);

-- RLS
alter table dekubitus_risiko enable row level security;
alter table lagerungsplan enable row level security;
alter table lagerungsprotokoll enable row level security;

create policy "anbieter_dekubitus_risiko" on dekubitus_risiko
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_dekubitus_risiko_insert" on dekubitus_risiko for insert
  with check (anbieter_id in (select id from anbieter where owner_id = auth.uid()));

create policy "anbieter_lagerungsplan" on lagerungsplan
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_lagerungsplan_insert" on lagerungsplan for insert
  with check (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_lagerungsplan_update" on lagerungsplan for update
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));

create policy "anbieter_lagerungsprotokoll" on lagerungsprotokoll
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_lagerungsprotokoll_insert" on lagerungsprotokoll for insert
  with check (anbieter_id in (select id from anbieter where owner_id = auth.uid()));

-- F79: Ernährungs- & Flüssigkeitsprotokoll

create table if not exists ernaehrungs_protokoll (
  id                    uuid primary key default gen_random_uuid(),
  bewohner_id           uuid not null references bewohner(id) on delete cascade,
  anbieter_id           uuid not null references anbieter(id) on delete cascade,
  datum                 date not null default current_date,
  mahlzeit              text not null
    check (mahlzeit in ('fruehstueck','zwischenmahlzeit_vm','mittagessen','zwischenmahlzeit_nm','abendessen','spaetmahlzeit')),
  angeboten             boolean not null default true,
  aufgenommen_prozent   int check (aufgenommen_prozent between 0 and 100),
  kostform              text
    check (kostform in ('normal','weich','passiert','fluessig','sonde','tpn')),
  appetit               text
    check (appetit in ('gut','maessig','schlecht','verweigert')),
  zusatznahrung         boolean not null default false,
  zusatznahrung_typ     text,
  gewicht_kg            numeric(5,2),
  besonderheiten        text,
  erfasst_von           uuid references auth.users(id),
  erstellt_am           timestamptz not null default now()
);

create table if not exists fluessigkeits_protokoll (
  id              uuid primary key default gen_random_uuid(),
  bewohner_id     uuid not null references bewohner(id) on delete cascade,
  anbieter_id     uuid not null references anbieter(id) on delete cascade,
  datum           date not null default current_date,
  uhrzeit         time not null,
  menge_ml        int not null check (menge_ml > 0),
  bilanz_typ      text not null default 'einfuhr'
    check (bilanz_typ in ('einfuhr','ausfuhr')),
  art             text not null,
  besonderheiten  text,
  erfasst_von     uuid references auth.users(id),
  erstellt_am     timestamptz not null default now()
);

create table if not exists ernaehrungs_ziele (
  id                            uuid primary key default gen_random_uuid(),
  bewohner_id                   uuid not null references bewohner(id) on delete cascade,
  anbieter_id                   uuid not null references anbieter(id) on delete cascade,
  kostform                      text default 'normal',
  kalorien_ziel                 int default 2000,
  fluessigkeit_ziel_ml          int default 1500,
  allergie_unvertraeglichkeit   text,
  besondere_ernaehrung          text,
  mna_score                     int,
  aktualisiert_am               timestamptz not null default now(),
  aktualisiert_von              uuid references auth.users(id),
  unique (bewohner_id)
);

-- Indexes
create index if not exists idx_ernaehrungs_protokoll_bewohner on ernaehrungs_protokoll(bewohner_id);
create index if not exists idx_ernaehrungs_protokoll_datum on ernaehrungs_protokoll(datum);
create index if not exists idx_ernaehrungs_protokoll_anbieter on ernaehrungs_protokoll(anbieter_id);
create index if not exists idx_fluessigkeits_protokoll_bewohner on fluessigkeits_protokoll(bewohner_id);
create index if not exists idx_fluessigkeits_protokoll_datum on fluessigkeits_protokoll(datum);
create index if not exists idx_fluessigkeits_protokoll_anbieter on fluessigkeits_protokoll(anbieter_id);
create index if not exists idx_ernaehrungs_ziele_bewohner on ernaehrungs_ziele(bewohner_id);

-- RLS
alter table ernaehrungs_protokoll enable row level security;
alter table fluessigkeits_protokoll enable row level security;
alter table ernaehrungs_ziele enable row level security;

create policy "anbieter_ernaehrungs_protokoll" on ernaehrungs_protokoll
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_ernaehrungs_protokoll_insert" on ernaehrungs_protokoll for insert
  with check (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_ernaehrungs_protokoll_update" on ernaehrungs_protokoll for update
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));

create policy "anbieter_fluessigkeits_protokoll" on fluessigkeits_protokoll
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_fluessigkeits_protokoll_insert" on fluessigkeits_protokoll for insert
  with check (anbieter_id in (select id from anbieter where owner_id = auth.uid()));

create policy "anbieter_ernaehrungs_ziele" on ernaehrungs_ziele
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_ernaehrungs_ziele_insert" on ernaehrungs_ziele for insert
  with check (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_ernaehrungs_ziele_update" on ernaehrungs_ziele for update
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));

-- F78: Bewohner-Aktivitäten & Soziale Teilhabe

create table if not exists aktivitaeten_angebote (
  id            uuid primary key default gen_random_uuid(),
  anbieter_id   uuid not null references anbieter(id) on delete cascade,
  titel         text not null,
  beschreibung  text,
  kategorie     text not null default 'sozial'
                  check (kategorie in ('bewegung','kultur','sozial','therapie','religion','ausflug','handwerk','musik','gedaechtnis','sonstiges')),
  wochentag     int check (wochentag between 0 and 6),  -- 0=Mo, 6=So
  uhrzeit       time,
  dauer_min     int default 60,
  kapazitaet    int,
  ort           text,
  aktiv         boolean not null default true,
  verantwortlich text,
  erstellt_von  uuid references auth.users(id),
  erstellt_am   timestamptz not null default now(),
  aktualisiert_am timestamptz not null default now()
);

create table if not exists aktivitaeten_teilnahmen (
  id            uuid primary key default gen_random_uuid(),
  angebot_id    uuid not null references aktivitaeten_angebote(id) on delete cascade,
  bewohner_id   uuid not null references bewohner(id) on delete cascade,
  anbieter_id   uuid not null references anbieter(id) on delete cascade,
  datum         date not null default current_date,
  teilgenommen  boolean not null default true,
  stimmung      text check (stimmung in ('sehr_gut','gut','neutral','schlecht','sehr_schlecht')),
  beobachtungen text,
  abgesagt      boolean not null default false,
  abgesagt_grund text,
  erstellt_von  uuid references auth.users(id),
  erstellt_am   timestamptz not null default now(),
  unique (angebot_id, bewohner_id, datum)
);

-- Indexes
create index if not exists idx_aktivitaeten_angebote_anbieter on aktivitaeten_angebote(anbieter_id);
create index if not exists idx_aktivitaeten_angebote_kategorie on aktivitaeten_angebote(kategorie);
create index if not exists idx_aktivitaeten_angebote_aktiv on aktivitaeten_angebote(aktiv);
create index if not exists idx_aktivitaeten_teilnahmen_angebot on aktivitaeten_teilnahmen(angebot_id);
create index if not exists idx_aktivitaeten_teilnahmen_bewohner on aktivitaeten_teilnahmen(bewohner_id);
create index if not exists idx_aktivitaeten_teilnahmen_datum on aktivitaeten_teilnahmen(datum);

-- RLS
alter table aktivitaeten_angebote enable row level security;
alter table aktivitaeten_teilnahmen enable row level security;

create policy "anbieter_aktivitaeten_angebote" on aktivitaeten_angebote
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_aktivitaeten_angebote_insert" on aktivitaeten_angebote for insert
  with check (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_aktivitaeten_angebote_update" on aktivitaeten_angebote for update
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));

create policy "anbieter_aktivitaeten_teilnahmen" on aktivitaeten_teilnahmen
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_aktivitaeten_teilnahmen_insert" on aktivitaeten_teilnahmen for insert
  with check (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_aktivitaeten_teilnahmen_update" on aktivitaeten_teilnahmen for update
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));

-- updated_at trigger
create or replace function update_aktivitaeten_angebote_updated_at()
returns trigger language plpgsql as $$
begin new.aktualisiert_am = now(); return new; end; $$;
create trigger aktivitaeten_angebote_updated_at before update on aktivitaeten_angebote
  for each row execute function update_aktivitaeten_angebote_updated_at();

-- F76: Therapiemanagement (Physio/Ergo/Logo/Musik/Kunst)

create table if not exists therapien (
  id            uuid primary key default gen_random_uuid(),
  anbieter_id   uuid not null references anbieter(id) on delete cascade,
  bewohner_id   uuid not null references bewohner(id) on delete cascade,
  therapieart   text not null check (therapieart in ('physiotherapie','ergotherapie','logopaedie','musiktherapie','kunsttherapie','sonstiges')),
  therapeut_name text,
  ziel          text,
  frequenz      text,
  beginn_datum  date not null default current_date,
  ende_datum    date,
  status        text not null default 'aktiv' check (status in ('aktiv','pausiert','abgeschlossen')),
  notizen       text,
  erstellt_von  uuid references auth.users(id),
  erstellt_am   timestamptz not null default now(),
  aktualisiert_am timestamptz not null default now()
);

create table if not exists therapie_einheiten (
  id              uuid primary key default gen_random_uuid(),
  therapie_id     uuid not null references therapien(id) on delete cascade,
  bewohner_id     uuid not null references bewohner(id) on delete cascade,
  anbieter_id     uuid not null references anbieter(id) on delete cascade,
  datum           date not null default current_date,
  dauer_min       int default 45,
  inhalt          text,
  verlauf         text check (verlauf in ('sehr_gut','gut','mittel','schlecht','abgebrochen')) default 'gut',
  kooperation     text check (kooperation in ('sehr_gut','gut','eingeschraenkt','verweigert')),
  zielfortschritt text,
  abgesagt        boolean not null default false,
  abgesagt_grund  text,
  abgerechnet     boolean not null default false,
  erstellt_von    uuid references auth.users(id),
  erstellt_am     timestamptz not null default now()
);

-- Indexes
create index if not exists idx_therapien_bewohner on therapien(bewohner_id);
create index if not exists idx_therapien_anbieter on therapien(anbieter_id);
create index if not exists idx_therapien_status on therapien(status);
create index if not exists idx_therapie_einheiten_therapie on therapie_einheiten(therapie_id);
create index if not exists idx_therapie_einheiten_bewohner on therapie_einheiten(bewohner_id);
create index if not exists idx_therapie_einheiten_datum on therapie_einheiten(datum);

-- RLS
alter table therapien enable row level security;
alter table therapie_einheiten enable row level security;

create policy "anbieter_therapien" on therapien
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_therapien_insert" on therapien for insert
  with check (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_therapien_update" on therapien for update
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));

create policy "anbieter_therapie_einheiten" on therapie_einheiten
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_therapie_einheiten_insert" on therapie_einheiten for insert
  with check (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_therapie_einheiten_update" on therapie_einheiten for update
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));

-- updated_at trigger
create or replace function update_therapien_updated_at()
returns trigger language plpgsql as $$
begin new.aktualisiert_am = now(); return new; end; $$;
create trigger therapien_updated_at before update on therapien
  for each row execute function update_therapien_updated_at();

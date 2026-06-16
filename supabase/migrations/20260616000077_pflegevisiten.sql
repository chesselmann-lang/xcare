-- F77: Pflegevisite & Fallbesprechung

create table if not exists pflegevisiten (
  id              uuid primary key default gen_random_uuid(),
  anbieter_id     uuid not null references anbieter(id) on delete cascade,
  bewohner_id     uuid not null references bewohner(id) on delete cascade,
  datum           date not null default current_date,
  uhrzeit         time,
  typ             text not null default 'regelvisite'
                    check (typ in ('regelvisite','anlassvisite','fallbesprechung','entlassvisite','aufnahmevisite')),
  status          text not null default 'geplant'
                    check (status in ('geplant','durchgefuehrt','abgesagt')),
  teilnehmer      jsonb default '[]',
  allgemeinzustand text,
  befunde         text,
  probleme        text,
  massnahmen      text,
  ziele           text,
  naechste_visite date,
  hinweise        text,
  erstellt_von    uuid references auth.users(id),
  durchgefuehrt_von uuid references auth.users(id),
  erstellt_am     timestamptz not null default now(),
  aktualisiert_am timestamptz not null default now()
);

create table if not exists visite_aufgaben (
  id            uuid primary key default gen_random_uuid(),
  visite_id     uuid not null references pflegevisiten(id) on delete cascade,
  anbieter_id   uuid not null references anbieter(id) on delete cascade,
  aufgabe       text not null,
  verantwortlich text,
  faellig_bis   date,
  prioritaet    text default 'normal' check (prioritaet in ('hoch','normal','niedrig')),
  erledigt      boolean not null default false,
  erledigt_am   timestamptz,
  erstellt_am   timestamptz not null default now()
);

-- Indexes
create index if not exists idx_pflegevisiten_bewohner on pflegevisiten(bewohner_id);
create index if not exists idx_pflegevisiten_anbieter on pflegevisiten(anbieter_id);
create index if not exists idx_pflegevisiten_datum on pflegevisiten(datum);
create index if not exists idx_pflegevisiten_status on pflegevisiten(status);
create index if not exists idx_visite_aufgaben_visite on visite_aufgaben(visite_id);
create index if not exists idx_visite_aufgaben_anbieter on visite_aufgaben(anbieter_id);

-- RLS
alter table pflegevisiten enable row level security;
alter table visite_aufgaben enable row level security;

create policy "anbieter_pflegevisiten" on pflegevisiten
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_pflegevisiten_insert" on pflegevisiten for insert
  with check (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_pflegevisiten_update" on pflegevisiten for update
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));

create policy "anbieter_visite_aufgaben" on visite_aufgaben
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_visite_aufgaben_insert" on visite_aufgaben for insert
  with check (anbieter_id in (select id from anbieter where owner_id = auth.uid()));
create policy "anbieter_visite_aufgaben_update" on visite_aufgaben for update
  using (anbieter_id in (select id from anbieter where owner_id = auth.uid()));

-- updated_at trigger
create or replace function update_pflegevisiten_updated_at()
returns trigger language plpgsql as $$
begin new.aktualisiert_am = now(); return new; end; $$;
create trigger pflegevisiten_updated_at before update on pflegevisiten
  for each row execute function update_pflegevisiten_updated_at();

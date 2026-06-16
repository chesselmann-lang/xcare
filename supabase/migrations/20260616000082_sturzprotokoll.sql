-- F82: Sturzprotokoll & -prävention pro Bewohner

create table if not exists sturzprotokolle (
  id                    uuid primary key default gen_random_uuid(),
  bewohner_id           uuid not null references bewohner(id) on delete cascade,
  anbieter_id           uuid not null references anbieter(id) on delete cascade,
  datum                 date not null default current_date,
  uhrzeit               time,
  ort                   text not null,
  umstaende             text,
  verletzungen          text,
  schweregrad           text not null default 'kein_schaden'
                          check (schweregrad in ('kein_schaden', 'leicht', 'mittel', 'schwer')),
  massnahmen_sofort     text,
  arzt_informiert       boolean not null default false,
  arzt_name             text,
  angehoerige_informiert boolean not null default false,
  nachbeobachtung       text,
  praevention_massnahmen text,
  erfasst_von           uuid references auth.users(id),
  erstellt_am           timestamptz not null default now(),
  aktualisiert_am       timestamptz not null default now()
);

-- Sturzrisiko-Einschätzung (MFS-ähnlich, einmalig + aktualisierbar)
create table if not exists sturzrisiko_einschaetzung (
  id                    uuid primary key default gen_random_uuid(),
  bewohner_id           uuid not null references bewohner(id) on delete cascade,
  anbieter_id           uuid not null references anbieter(id) on delete cascade,
  datum                 date not null default current_date,
  -- Morse Fall Scale Faktoren (vereinfacht)
  sturzgeschichte       boolean not null default false,  -- Sturz in letzten 3 Monaten
  sekundaerdiagnose     boolean not null default false,
  gehhilfe              text not null default 'keine'
                          check (gehhilfe in ('keine', 'bettruhe', 'rollstuhl', 'gehhilfe', 'moebel')),
  heparininfusion       boolean not null default false,
  gangbild              text not null default 'normal'
                          check (gangbild in ('normal', 'schwaechlich', 'beeintraechtigt')),
  mentaler_status       text not null default 'orientiert'
                          check (mentaler_status in ('orientiert', 'vergesslich')),
  gesamtpunkte          smallint not null default 0,
  risikostufe           text not null default 'niedrig'
                          check (risikostufe in ('niedrig', 'mittel', 'hoch')),
  massnahmen            text[],
  erfasst_von           uuid references auth.users(id),
  erstellt_am           timestamptz not null default now(),
  aktualisiert_am       timestamptz not null default now()
);

-- RLS
alter table sturzprotokolle enable row level security;
alter table sturzrisiko_einschaetzung enable row level security;

create policy "anbieter_sturzprotokolle" on sturzprotokolle
  using (anbieter_id in (
    select a.id from anbieter a
    join profiles p on p.id = a.profile_id
    where p.user_id = auth.uid()
  ));
create policy "anbieter_sturzprotokolle_insert" on sturzprotokolle for insert
  with check (anbieter_id in (
    select a.id from anbieter a
    join profiles p on p.id = a.profile_id
    where p.user_id = auth.uid()
  ));
create policy "anbieter_sturzprotokolle_update" on sturzprotokolle for update
  using (anbieter_id in (
    select a.id from anbieter a
    join profiles p on p.id = a.profile_id
    where p.user_id = auth.uid()
  ));
create policy "anbieter_sturzprotokolle_delete" on sturzprotokolle for delete
  using (anbieter_id in (
    select a.id from anbieter a
    join profiles p on p.id = a.profile_id
    where p.user_id = auth.uid()
  ));

create policy "anbieter_sturzrisiko" on sturzrisiko_einschaetzung
  using (anbieter_id in (
    select a.id from anbieter a
    join profiles p on p.id = a.profile_id
    where p.user_id = auth.uid()
  ));
create policy "anbieter_sturzrisiko_insert" on sturzrisiko_einschaetzung for insert
  with check (anbieter_id in (
    select a.id from anbieter a
    join profiles p on p.id = a.profile_id
    where p.user_id = auth.uid()
  ));
create policy "anbieter_sturzrisiko_update" on sturzrisiko_einschaetzung for update
  using (anbieter_id in (
    select a.id from anbieter a
    join profiles p on p.id = a.profile_id
    where p.user_id = auth.uid()
  ));

-- Indizes
create index if not exists idx_sturzprotokolle_bewohner on sturzprotokolle(bewohner_id, datum desc);
create index if not exists idx_sturzprotokolle_anbieter on sturzprotokolle(anbieter_id, datum desc);
create index if not exists idx_sturzrisiko_bewohner on sturzrisiko_einschaetzung(bewohner_id, datum desc);

-- updated_at trigger
create or replace function update_sturzprotokolle_updated_at()
returns trigger language plpgsql as $$
begin new.aktualisiert_am = now(); return new; end; $$;

create trigger trg_sturzprotokolle_updated_at
  before update on sturzprotokolle
  for each row execute function update_sturzprotokolle_updated_at();

create trigger trg_sturzrisiko_updated_at
  before update on sturzrisiko_einschaetzung
  for each row execute function update_sturzprotokolle_updated_at();

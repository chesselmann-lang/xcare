-- F84: Gewichts- & Vitalwerte-Verlauf pro Bewohner

create table if not exists gewichts_eintraege (
  id                    uuid primary key default gen_random_uuid(),
  bewohner_id           uuid not null references bewohner(id) on delete cascade,
  anbieter_id           uuid not null references anbieter(id) on delete cascade,
  datum                 date not null default current_date,
  uhrzeit               time,
  gewicht_kg            numeric(5,2) not null check (gewicht_kg > 0 and gewicht_kg < 500),
  bmi                   numeric(4,1),              -- computed & stored for convenience
  -- Kontext
  gemessen_unter        text default 'normal'
                          check (gemessen_unter in ('normal', 'nüchtern', 'nach_mahlzeit', 'mit_hilfsmittel')),
  notizen               text,
  erfasst_von           uuid references auth.users(id),
  erstellt_am           timestamptz not null default now()
);

-- Vitalwerte (erweitertes Set: RR, Puls, Temp, O2, Blutzucker, Atemfrequenz)
create table if not exists vitalwerte_eintraege (
  id                    uuid primary key default gen_random_uuid(),
  bewohner_id           uuid not null references bewohner(id) on delete cascade,
  anbieter_id           uuid not null references anbieter(id) on delete cascade,
  datum                 date not null default current_date,
  uhrzeit               time,
  -- Blutdruck
  rr_systolisch         smallint check (rr_systolisch is null or (rr_systolisch > 0 and rr_systolisch < 300)),
  rr_diastolisch        smallint check (rr_diastolisch is null or (rr_diastolisch > 0 and rr_diastolisch < 200)),
  -- Puls
  puls                  smallint check (puls is null or (puls > 0 and puls < 300)),
  rhythmus              text check (rhythmus is null or rhythmus in ('regelmäßig', 'unregelmäßig', 'nicht_beurteilbar')),
  -- Temperatur
  temperatur_c          numeric(4,1) check (temperatur_c is null or (temperatur_c > 30 and temperatur_c < 45)),
  temperatur_ort        text check (temperatur_ort is null or temperatur_ort in ('axillär', 'oral', 'rektal', 'Ohr', 'Stirn')),
  -- Sauerstoffsättigung
  spo2_prozent          smallint check (spo2_prozent is null or (spo2_prozent > 0 and spo2_prozent <= 100)),
  o2_lmin               numeric(4,1),              -- Sauerstoffzufuhr L/min
  -- Blutzucker
  bz_mmol               numeric(5,2),              -- mmol/L
  bz_zeitpunkt          text check (bz_zeitpunkt is null or bz_zeitpunkt in ('nüchtern', 'postprandial', 'random')),
  -- Atemfrequenz
  atemfrequenz          smallint check (atemfrequenz is null or (atemfrequenz > 0 and atemfrequenz < 100)),
  -- Schmerz (NRS-Schnellerfassung)
  nrs_wert              smallint check (nrs_wert is null or (nrs_wert >= 0 and nrs_wert <= 10)),
  -- Meta
  notizen               text,
  erfasst_von           uuid references auth.users(id),
  erstellt_am           timestamptz not null default now()
);

-- Bewohner-Normwerte / Zielwerte (einmalig pro Bewohner, pflegefachliche Referenz)
create table if not exists bewohner_normwerte (
  bewohner_id           uuid primary key references bewohner(id) on delete cascade,
  anbieter_id           uuid not null references anbieter(id) on delete cascade,
  -- Gewicht
  zielgewicht_kg        numeric(5,2),
  groesse_cm            smallint,
  -- Blutdruck Zielbereich
  rr_ziel_sys_min       smallint,
  rr_ziel_sys_max       smallint,
  rr_ziel_dia_min       smallint,
  rr_ziel_dia_max       smallint,
  -- BZ
  bz_ziel_min           numeric(5,2),
  bz_ziel_max           numeric(5,2),
  -- O2
  spo2_ziel_min         smallint,
  -- Notizen
  notizen               text,
  aktualisiert_am       timestamptz not null default now(),
  aktualisiert_von      uuid references auth.users(id)
);

-- RLS
alter table gewichts_eintraege enable row level security;
alter table vitalwerte_eintraege enable row level security;
alter table bewohner_normwerte enable row level security;

create policy "anbieter_gewicht_select" on gewichts_eintraege
  using (anbieter_id in (
    select a.id from anbieter a join profiles p on p.id = a.profile_id where p.user_id = auth.uid()
  ));
create policy "anbieter_gewicht_insert" on gewichts_eintraege for insert
  with check (anbieter_id in (
    select a.id from anbieter a join profiles p on p.id = a.profile_id where p.user_id = auth.uid()
  ));
create policy "anbieter_gewicht_delete" on gewichts_eintraege for delete
  using (anbieter_id in (
    select a.id from anbieter a join profiles p on p.id = a.profile_id where p.user_id = auth.uid()
  ));

create policy "anbieter_vital_select" on vitalwerte_eintraege
  using (anbieter_id in (
    select a.id from anbieter a join profiles p on p.id = a.profile_id where p.user_id = auth.uid()
  ));
create policy "anbieter_vital_insert" on vitalwerte_eintraege for insert
  with check (anbieter_id in (
    select a.id from anbieter a join profiles p on p.id = a.profile_id where p.user_id = auth.uid()
  ));
create policy "anbieter_vital_delete" on vitalwerte_eintraege for delete
  using (anbieter_id in (
    select a.id from anbieter a join profiles p on p.id = a.profile_id where p.user_id = auth.uid()
  ));

create policy "anbieter_normwerte" on bewohner_normwerte
  using (anbieter_id in (
    select a.id from anbieter a join profiles p on p.id = a.profile_id where p.user_id = auth.uid()
  ));
create policy "anbieter_normwerte_insert" on bewohner_normwerte for insert
  with check (anbieter_id in (
    select a.id from anbieter a join profiles p on p.id = a.profile_id where p.user_id = auth.uid()
  ));
create policy "anbieter_normwerte_update" on bewohner_normwerte for update
  using (anbieter_id in (
    select a.id from anbieter a join profiles p on p.id = a.profile_id where p.user_id = auth.uid()
  ));

-- Indizes
create index if not exists idx_gewicht_bewohner on gewichts_eintraege(bewohner_id, datum desc);
create index if not exists idx_vital_bewohner on vitalwerte_eintraege(bewohner_id, datum desc);
create index if not exists idx_vital_anbieter on vitalwerte_eintraege(anbieter_id, datum desc);

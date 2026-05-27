create table if not exists public.smarthome_geraete (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  typ text not null check (typ in (
    'hue_bridge', 'bewegungsmelder', 'tuermelder', 'bettmelder',
    'wearable', 'notfallknopf', 'temperatursensor', 'mqtt_geraet'
  )),
  name text not null,
  geraete_id text,          -- Device-specific ID (Hue light ID, MQTT topic suffix)
  verbindungstyp text not null check (verbindungstyp in ('hue', 'mqtt', 'bluetooth', 'manual')),
  
  -- Konfiguration
  konfiguration jsonb default '{}',
  aktiv boolean default true,
  
  -- Letzter Status
  letzter_wert jsonb,
  letzter_kontakt timestamptz,
  
  created_at timestamptz default now()
);

create table if not exists public.smarthome_ereignisse (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  geraet_id uuid references public.smarthome_geraete(id) on delete set null,
  
  typ text not null check (typ in (
    'bewegung', 'tuer_offen', 'tuer_geschlossen', 'sturz_erkannt',
    'notfall', 'bett_verlassen', 'bett_betreten', 'inaktivitaet'
  )),
  schweregrad text default 'info' check (schweregrad in ('info', 'warnung', 'kritisch')),
  daten jsonb,
  verarbeitet boolean default false,
  
  created_at timestamptz default now()
);

alter table public.smarthome_geraete enable row level security;
alter table public.smarthome_ereignisse enable row level security;
create policy "Nutzer verwaltet Geraete" on public.smarthome_geraete for all using (user_id = auth.uid());
create policy "Nutzer sieht Ereignisse" on public.smarthome_ereignisse for all using (user_id = auth.uid());

create index smarthome_ereignisse_user_idx on public.smarthome_ereignisse(user_id, created_at desc);
create index smarthome_ereignisse_unprocessed_idx on public.smarthome_ereignisse(verarbeitet, schweregrad);

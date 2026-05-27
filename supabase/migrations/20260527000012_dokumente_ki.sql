create table if not exists public.dokument_analysen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Dokument
  dateiname text not null,
  storage_path text not null,    -- Supabase Storage path
  dateityp text,                  -- pdf, image/jpeg, etc.
  
  -- Klassifizierung
  dokument_typ text check (dokument_typ in (
    'mdk_bescheid', 'pflegegutachten', 'ablehnungsbescheid',
    'widerspruchsbescheid', 'kassenschreiben', 'arztbrief', 'sonstiges'
  )),
  
  -- KI-Analyse
  ki_zusammenfassung text,
  ki_extrahierte_daten jsonb,     -- {pflegegrad, datum, aktenzeichen, begruendung, ...}
  ki_handlungsempfehlung text,
  ki_widerspruch_begruendung text,
  
  -- Verarbeitungsstatus
  status text default 'ausstehend' check (status in ('ausstehend', 'verarbeitung', 'fertig', 'fehler')),
  fehler_nachricht text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.dokument_analysen enable row level security;
create policy "Nutzer verwaltet Analysen" on public.dokument_analysen for all using (user_id = auth.uid());
create index dokument_analysen_user_idx on public.dokument_analysen(user_id, created_at desc);

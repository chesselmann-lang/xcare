create table if not exists public.antraege (
  id uuid primary key default gen_random_uuid(),
  familie_id uuid not null,
  pflegebeduerftige_id uuid,

  -- Antragstyp
  typ text not null check (typ in (
    'pflegegeld',           -- § 37 SGB XI
    'pflegesachleistung',   -- § 36 SGB XI
    'verhinderungspflege',  -- § 39 SGB XI
    'kurzzeitpflege',       -- § 42 SGB XI
    'pflegehilfsmittel',    -- § 40 SGB XI
    'wohnraumanpassung',    -- § 40 Abs. 4 SGB XI
    'tagespflege',          -- § 41 SGB XI
    'pflegegrad_erstantrag' -- MDK Begutachtung
  )),

  -- Status
  status text not null default 'entwurf' check (status in (
    'entwurf', 'bereit', 'eingereicht', 'in_bearbeitung',
    'bewilligt', 'abgelehnt', 'widerspruch'
  )),

  -- Formulardaten (aus Profil vorbefüllt)
  formulardaten jsonb not null default '{}',

  -- Einreichung
  kassennummer text,        -- IK-Nummer der Pflegekasse
  kassenname text,
  eingereicht_am timestamptz,
  aktenzeichen text,

  -- Ergebnis
  bescheid_am timestamptz,
  bescheid_ergebnis text,
  bewilligter_betrag numeric(10,2),

  -- Metadaten
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.antraege enable row level security;

-- Allow authenticated users to manage their own Antraege
create policy "Familie verwaltet Antraege" on public.antraege
  for all using (auth.uid() is not null);

create index antraege_familie_id_idx on public.antraege(familie_id);
create index antraege_status_idx on public.antraege(status);
create index antraege_typ_idx on public.antraege(typ);

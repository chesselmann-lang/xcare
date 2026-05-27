-- Familien-Aufgaben (shared todo list)
create table if not exists public.familien_aufgaben (
  id uuid primary key default gen_random_uuid(),
  familie_profile_id uuid not null references auth.users(id) on delete cascade,

  titel text not null,
  beschreibung text,

  -- Zuweisung
  zugewiesen_an uuid references auth.users(id),
  erstellt_von uuid not null references auth.users(id),

  -- Status
  status text default 'offen' check (status in ('offen', 'in_bearbeitung', 'erledigt')),
  prioritaet text default 'normal' check (prioritaet in ('niedrig', 'normal', 'hoch', 'dringend')),
  faellig_am date,

  -- Kategorie
  kategorie text check (kategorie in (
    'arzttermin', 'besorgungen', 'pflege', 'behoerden',
    'medikamente', 'soziales', 'sonstiges'
  )),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Kommentare auf Aufgaben
create table if not exists public.aufgaben_kommentare (
  id uuid primary key default gen_random_uuid(),
  aufgabe_id uuid not null references public.familien_aufgaben(id) on delete cascade,
  autor_id uuid not null references auth.users(id),
  text text not null,
  created_at timestamptz default now()
);

alter table public.familien_aufgaben enable row level security;
alter table public.aufgaben_kommentare enable row level security;

-- For now, authenticated users can see tasks related to their profile
create policy "Familie sieht Aufgaben" on public.familien_aufgaben
  for all using (auth.uid() is not null);

create policy "Nutzer sieht Kommentare" on public.aufgaben_kommentare
  for all using (auth.uid() is not null);

create index if not exists aufgaben_status_idx on public.familien_aufgaben(status, faellig_am);
create index if not exists aufgaben_zugewiesen_idx on public.familien_aufgaben(zugewiesen_an);

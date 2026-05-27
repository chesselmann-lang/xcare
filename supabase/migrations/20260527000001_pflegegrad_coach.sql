-- Pflegegrad-Coach: AI-gestützte Pflegegrad-Einschätzung
-- Nutzt profiles.id als familie_profile_id (konsistent mit pflegegrad_einschaetzungen)
create table if not exists public.pflegegrad_coach_sessions (
  id uuid primary key default gen_random_uuid(),
  familie_profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'expired')),

  -- Fragebogen-Antworten (JSONB für Flexibilität — NBI-Modul-Keys)
  antworten jsonb not null default '{}',

  -- KI-Ergebnis
  geschaetzter_pflegegrad smallint check (geschaetzter_pflegegrad between 1 and 5),
  ki_begruendung text,
  ki_empfehlungen jsonb,   -- string[]
  ki_warnhinweise jsonb,   -- string[]

  -- Gewichtete NBI-Gesamtpunkte (0–100)
  nbi_gesamt_punkte numeric(5,2),

  -- Metadaten
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.pflegegrad_coach_sessions enable row level security;

create policy "Familie sieht eigene Coach-Sessions"
  on public.pflegegrad_coach_sessions
  for all
  using (
    familie_profile_id in (
      select id from public.profiles where user_id = auth.uid()
    )
  );

create policy "Admin sieht alle Coach-Sessions"
  on public.pflegegrad_coach_sessions
  for all
  using (
    exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin')
  );

-- Indexes
create index pflegegrad_coach_sessions_familie_idx on public.pflegegrad_coach_sessions(familie_profile_id);
create index pflegegrad_coach_sessions_status_idx  on public.pflegegrad_coach_sessions(status);
create index pflegegrad_coach_sessions_created_idx on public.pflegegrad_coach_sessions(created_at desc);

-- updated_at trigger
create or replace function public.update_pflegegrad_coach_session_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pflegegrad_coach_session_updated_at
  before update on public.pflegegrad_coach_sessions
  for each row execute function public.update_pflegegrad_coach_session_updated_at();

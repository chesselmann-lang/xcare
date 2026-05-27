-- ============================================================
-- Migration: MDK-Widerspruch-Generator
-- Feature F7 — SGB XI § 78 ff.
-- ============================================================

create table if not exists public.widersprueche (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Bezug auf den abgelehnten Bescheid
  bezug_typ text not null check (bezug_typ in ('pflegegrad', 'leistung', 'antrag', 'bescheid')),
  bescheid_datum date,
  bescheid_aktenzeichen text,
  pflegekasse_name text,

  -- Inhalt
  ablehnung_grund text,             -- Warum wurde abgelehnt? (User-Eingabe)
  eigene_argumentation text,        -- Eigene Argumente des Nutzers
  ki_generierter_text text,         -- KI-generierter Widerspruchsbrief

  -- Workflow-Status
  status text not null default 'entwurf' check (status in (
    'entwurf', 'generiert', 'eingereicht', 'bearbeitung', 'gewonnen', 'abgelehnt'
  )),
  frist_datum date,                 -- Gesetzlich: 1 Monat ab Bescheid-Datum (§ 84 SGG)
  eingereicht_am timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

alter table public.widersprueche enable row level security;

create policy "Nutzer verwaltet Widersprueche"
  on public.widersprueche for all
  using (user_id = auth.uid());

-- ─── Automatisches updated_at ────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger widersprueche_updated_at
  before update on public.widersprueche
  for each row execute function public.set_updated_at();

-- ─── Indizes ─────────────────────────────────────────────────────────────────

create index if not exists widersprueche_user_idx on public.widersprueche(user_id);
create index if not exists widersprueche_frist_idx on public.widersprueche(frist_datum);
create index if not exists widersprueche_status_idx on public.widersprueche(status);

-- ============================================================
-- Migration: ePA-Integration (elektronische Patientenakte)
-- Feature F5 — FHIR R4 / gematik ePA 3.0
-- ============================================================

-- ePA-Verbindungen: verknüpft einen xcare-Nutzer mit seiner FHIR Patient-ID
create table if not exists public.epa_verbindungen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  fhir_patient_id text not null,
  kvnr text,                        -- Krankenversichertennummer (GKV)
  letzter_sync timestamptz,
  sync_status text default 'aktiv' check (sync_status in ('aktiv', 'fehler', 'deaktiviert')),
  error_message text,
  created_at timestamptz default now()
);

-- Medikamente aus der ePA (MedicationRequest-Ressourcen)
create table if not exists public.epa_medikamente (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fhir_id text,                     -- FHIR MedicationRequest.id
  name text not null,               -- medicationCodeableConcept.text
  wirkstoff text,                   -- coding.display (z.B. ATC-Code Bezeichnung)
  dosierung text,                   -- dosageInstruction[0].text
  einnahme_anweisung text,          -- dosageInstruction[0].text (ausführlich)
  verordnet_am date,                -- authoredOn
  aktiv boolean default true,
  imported_at timestamptz default now()
);

-- Diagnosen aus der ePA (Condition-Ressourcen)
create table if not exists public.epa_diagnosen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fhir_id text,                     -- FHIR Condition.id
  icd10_code text,                  -- code.coding[system=icd-10].code
  bezeichnung text not null,        -- code.text
  seit date,                        -- onsetDateTime
  status text default 'aktiv',      -- clinicalStatus.coding[0].code
  imported_at timestamptz default now()
);

-- ─── Row-Level Security ───────────────────────────────────────────────────────

alter table public.epa_verbindungen enable row level security;
alter table public.epa_medikamente enable row level security;
alter table public.epa_diagnosen enable row level security;

create policy "Nutzer sieht eigene ePA"
  on public.epa_verbindungen for all
  using (user_id = auth.uid());

create policy "Nutzer sieht eigene Medikamente"
  on public.epa_medikamente for all
  using (user_id = auth.uid());

create policy "Nutzer sieht eigene Diagnosen"
  on public.epa_diagnosen for all
  using (user_id = auth.uid());

-- ─── Indizes ─────────────────────────────────────────────────────────────────

create index if not exists epa_medikamente_user_idx on public.epa_medikamente(user_id);
create index if not exists epa_diagnosen_user_idx on public.epa_diagnosen(user_id);
create index if not exists epa_medikamente_fhir_idx on public.epa_medikamente(fhir_id);
create index if not exists epa_diagnosen_fhir_idx on public.epa_diagnosen(fhir_id);

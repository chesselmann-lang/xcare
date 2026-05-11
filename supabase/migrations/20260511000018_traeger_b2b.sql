-- Phase 9C: B2B Träger/Kommunen — Fallmanagement
-- Erlösstrom #1 laut AP08: SaaS für Sozialträger, AWO, Caritas, Kommunen

-- Träger-Profile (Sozialträger, Kommunen, Sozialämter)
CREATE TABLE IF NOT EXISTS traeger_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organisation    TEXT NOT NULL,           -- z.B. "AWO Bayern", "Landkreis Rosenheim"
  typ             TEXT NOT NULL DEFAULT 'traeger'
                  CHECK (typ IN ('traeger', 'kommune', 'sozialamt', 'krankenhaus', 'beratungsstelle')),
  strasse         TEXT,
  plz             TEXT,
  ort             TEXT,
  telefon         TEXT,
  website         TEXT,
  abo_plan        TEXT NOT NULL DEFAULT 'starter'
                  CHECK (abo_plan IN ('starter', 'professional', 'enterprise')),
  max_klienten    INTEGER NOT NULL DEFAULT 50,  -- Limit je Abo-Plan
  verified        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profile_id)
);

-- Klienten eines Trägers (Fallmanagement)
CREATE TABLE IF NOT EXISTS traeger_klienten (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traeger_id      UUID NOT NULL REFERENCES traeger_profiles(id) ON DELETE CASCADE,
  -- Pseudonymisierte Klientendaten (kein echter Name erforderlich)
  klienten_nr     TEXT NOT NULL,           -- interne Fallnummer des Trägers
  vorname         TEXT,
  nachname        TEXT,
  geburtsjahr     INTEGER,
  plz             TEXT,
  lebenslage      TEXT,
  pflegegrad      INTEGER CHECK (pflegegrad BETWEEN 1 AND 5),
  notizen         TEXT,
  status          TEXT NOT NULL DEFAULT 'aktiv'
                  CHECK (status IN ('aktiv', 'abgeschlossen', 'pausiert')),
  -- Letzte Anspruchsprüfung
  letzte_pruefung_at TIMESTAMPTZ,
  pruefungs_ergebnis JSONB,               -- AnspruchsErgebnis-Snapshot
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (traeger_id, klienten_nr)
);

-- Massenprüfung-Aufträge (CSV-Upload)
CREATE TABLE IF NOT EXISTS traeger_massenpruefungen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traeger_id      UUID NOT NULL REFERENCES traeger_profiles(id) ON DELETE CASCADE,
  dateiname       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  zeilen_gesamt   INTEGER DEFAULT 0,
  zeilen_verarbeitet INTEGER DEFAULT 0,
  ergebnis_url    TEXT,                   -- Supabase Storage URL für Ergebnis-CSV
  fehler          TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

-- RLS
ALTER TABLE traeger_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE traeger_klienten ENABLE ROW LEVEL SECURITY;
ALTER TABLE traeger_massenpruefungen ENABLE ROW LEVEL SECURITY;

-- Träger: eigenes Profil lesen/schreiben
CREATE POLICY "traeger_own_profile" ON traeger_profiles
  FOR ALL TO authenticated
  USING (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Admin: alle Träger-Profile
CREATE POLICY "admin_all_traeger_profiles" ON traeger_profiles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Träger: eigene Klienten
CREATE POLICY "traeger_own_klienten" ON traeger_klienten
  FOR ALL TO authenticated
  USING (
    traeger_id IN (
      SELECT tp.id FROM traeger_profiles tp
      JOIN profiles p ON p.id = tp.profile_id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    traeger_id IN (
      SELECT tp.id FROM traeger_profiles tp
      JOIN profiles p ON p.id = tp.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Träger: eigene Massenprüfungen
CREATE POLICY "traeger_own_massenpruefungen" ON traeger_massenpruefungen
  FOR ALL TO authenticated
  USING (
    traeger_id IN (
      SELECT tp.id FROM traeger_profiles tp
      JOIN profiles p ON p.id = tp.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Role 'traeger' in profiles.role zulassen (falls CHECK Constraint)
-- (profiles.role CHECK wird via Migration ergänzt falls nötig)

-- Index
CREATE INDEX IF NOT EXISTS traeger_klienten_traeger_idx ON traeger_klienten (traeger_id, status);
CREATE INDEX IF NOT EXISTS traeger_klienten_lebenslage_idx ON traeger_klienten (lebenslage);

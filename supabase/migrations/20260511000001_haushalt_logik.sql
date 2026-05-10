-- ============================================
-- Migration: Haushalt-Logik (Phase 2B)
-- 7 Rollen, 5 Vollmachten-Typen, Haushaltsmitglieder
-- Stand: 2026-05-11
-- ============================================

-- 1. Haushalt-Tabelle (zentrale Verwaltungseinheit)
CREATE TABLE IF NOT EXISTS haushalte (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,                           -- z.B. "Familie Müller"
  plz         text,
  ort         text,
  erstellt_von uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 2. Haushaltsmitglieder (wer gehört zum Haushalt, mit welcher Rolle)
CREATE TYPE IF NOT EXISTS haushalt_rolle AS ENUM (
  'pflegebeduerftig',   -- Die Person, die Pflege/Hilfe erhält
  'pflegeperson',       -- Nicht-berufliche Pflegende (Angehörige)
  'betreuer',           -- Rechtlicher Betreuer nach §§ 1814ff BGB
  'vormund',            -- Vormund (für Minderjährige, §§ 1773ff BGB)
  'bevollmaechtigter',  -- Bevollmächtigte Person (Vollmacht)
  'kind',               -- Minderjähriges Kind im Haushalt
  'angehoeriger'        -- Sonstiger Angehöriger (ohne besondere Rechte)
);

CREATE TABLE IF NOT EXISTS haushaltsmitglieder (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  haushalt_id  uuid NOT NULL REFERENCES haushalte(id) ON DELETE CASCADE,
  profile_id   uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  -- Für nicht-registrierte Mitglieder:
  vorname      text,
  nachname     text,
  geburtsdatum date,
  rolle        haushalt_rolle NOT NULL,
  -- Metadaten Pflege
  pflegegrad   int CHECK (pflegegrad BETWEEN 1 AND 5),
  gdb          int CHECK (gdb IN (20,30,40,50,60,70,80,90,100)),
  -- Berechtigungen
  kann_anfragen_sehen  boolean DEFAULT false,
  kann_dokumente_sehen boolean DEFAULT false,
  kann_verwalten       boolean DEFAULT false,  -- Vollzugriff
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- 3. Vollmachten-Typen
CREATE TYPE IF NOT EXISTS vollmacht_typ AS ENUM (
  'generalvollmacht',          -- Allgemeine Handlungsvollmacht
  'vorsorgevollmacht',         -- Für Gesundheit + Vermögen im Vorsorgefall
  'betreuungsverfuegung',      -- Wunsch-Betreuer für den Betreuungsfall
  'patientenverfuegung',       -- Medizinische Entscheidungen
  'sorgerechtsverfuegung'      -- Sorgerecht für Kinder (§§ 1671, 1680 BGB)
);

CREATE TABLE IF NOT EXISTS vollmachten (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  haushalt_id     uuid NOT NULL REFERENCES haushalte(id) ON DELETE CASCADE,
  vollmachtgeber_id uuid REFERENCES haushaltsmitglieder(id) ON DELETE CASCADE,
  bevollmaechtigter_id uuid REFERENCES haushaltsmitglieder(id) ON DELETE CASCADE,
  typ             vollmacht_typ NOT NULL,
  titel           text NOT NULL,
  beschreibung    text,
  gueltig_ab      date,
  gueltig_bis     date,                   -- NULL = unbefristet
  notariell       boolean DEFAULT false,  -- Notariell beglaubigt
  registriert_beim text,                  -- z.B. "Amtsgericht München"
  dokument_id     uuid,                   -- Verweis auf Dokumenten-Tresor
  aktiv           boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 4. Profile erweitern: welchem Haushalt gehört dieser Nutzer an
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS haushalt_id uuid REFERENCES haushalte(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS haushalt_rolle haushalt_rolle;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_haushaltsmitglieder_haushalt ON haushaltsmitglieder(haushalt_id);
CREATE INDEX IF NOT EXISTS idx_haushaltsmitglieder_profile ON haushaltsmitglieder(profile_id);
CREATE INDEX IF NOT EXISTS idx_vollmachten_haushalt ON vollmachten(haushalt_id);
CREATE INDEX IF NOT EXISTS idx_profiles_haushalt ON profiles(haushalt_id);

-- 6. RLS
ALTER TABLE haushalte ENABLE ROW LEVEL SECURITY;
ALTER TABLE haushaltsmitglieder ENABLE ROW LEVEL SECURITY;
ALTER TABLE vollmachten ENABLE ROW LEVEL SECURITY;

-- Haushalt sehen: eigener Haushalt
CREATE POLICY "haushalt_select_own" ON haushalte
  FOR SELECT USING (
    id IN (
      SELECT haushalt_id FROM profiles WHERE user_id = auth.uid()
    ) OR
    erstellt_von = auth.uid()
  );

-- Haushalt erstellen: jeder angemeldete Nutzer
CREATE POLICY "haushalt_insert_auth" ON haushalte
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Haushalt bearbeiten: Ersteller
CREATE POLICY "haushalt_update_own" ON haushalte
  FOR UPDATE USING (erstellt_von = auth.uid());

-- Haushaltsmitglieder sehen: wenn im selben Haushalt
CREATE POLICY "mitglieder_select_haushalt" ON haushaltsmitglieder
  FOR SELECT USING (
    haushalt_id IN (
      SELECT haushalt_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "mitglieder_insert_haushalt" ON haushaltsmitglieder
  FOR INSERT WITH CHECK (
    haushalt_id IN (
      SELECT h.id FROM haushalte h WHERE h.erstellt_von = auth.uid()
    )
  );

-- Vollmachten: nur Haushaltsmitglieder mit Verwaltungsrecht
CREATE POLICY "vollmachten_select_haushalt" ON vollmachten
  FOR SELECT USING (
    haushalt_id IN (
      SELECT haushalt_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "vollmachten_insert_verwalter" ON vollmachten
  FOR INSERT WITH CHECK (
    haushalt_id IN (
      SELECT hm.haushalt_id
      FROM haushaltsmitglieder hm
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE hm.profile_id = p.user_id AND hm.kann_verwalten = true
    )
  );

-- Admin: Vollzugriff
CREATE POLICY "admin_all_haushalte" ON haushalte
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_mitglieder" ON haushaltsmitglieder
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_vollmachten" ON vollmachten
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

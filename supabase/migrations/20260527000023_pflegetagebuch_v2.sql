-- F29: Digitales Pflegetagebuch 2.0 + KI-Mustererkennung
-- Enhanced diary entries (extends existing pflegetagebuch if it exists, or creates fresh)

CREATE TABLE IF NOT EXISTS pflegetagebuch_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pflegebeduerftiger_id UUID, -- reference to care recipient (optional, for multi-person households)
  datum DATE NOT NULL DEFAULT CURRENT_DATE,
  uhrzeit TIME,
  kategorie TEXT CHECK (kategorie IN (
    'allgemein','mahlzeit','medikament','koerperpflege',
    'ausscheidung','schlaf','aktivitaet','arztbesuch',
    'sturzgeschehen','schmerzen','stimmung','vitalwerte','sonstiges'
  )) DEFAULT 'allgemein',
  eintrag TEXT NOT NULL,
  -- Structured fields
  schmerz_skala INT CHECK (schmerz_skala BETWEEN 0 AND 10),
  stimmung_skala INT CHECK (stimmung_skala BETWEEN 1 AND 5), -- 1=sehr schlecht, 5=sehr gut
  -- Vital signs
  blutdruck_systolisch INT,
  blutdruck_diastolisch INT,
  puls INT,
  temperatur NUMERIC(4,1),
  blutzucker NUMERIC(5,1), -- mg/dL
  gewicht NUMERIC(5,2), -- kg
  sauerstoffsaettigung INT CHECK (sauerstoffsaettigung BETWEEN 70 AND 100),
  -- Nutrition
  mahlzeit_beschreibung TEXT,
  fluessigkeit_ml INT,
  appetit TEXT CHECK (appetit IN ('gut','maessig','schlecht','verweigert')),
  -- Sleep
  schlaf_stunden NUMERIC(4,1),
  schlaf_qualitaet TEXT CHECK (schlaf_qualitaet IN ('gut','unruhig','unterbrochen','sehr_schlecht')),
  -- Medication taken
  medikamente_eingenommen JSONB, -- [{name, dosis, zeit, gegeben: true}]
  -- Flags for MDK report
  besonderheit BOOLEAN DEFAULT false,
  fuer_mdk_bericht BOOLEAN DEFAULT false,
  -- AI analysis fields
  ki_analyse JSONB, -- populated by analysis job
  erstellt_am TIMESTAMPTZ DEFAULT now()
);

-- Vital sign quick-capture (for rapid logging without full entry)
CREATE TABLE IF NOT EXISTS vitalwerte_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  gemessen_am TIMESTAMPTZ DEFAULT now(),
  blutdruck_sys INT,
  blutdruck_dia INT,
  puls INT,
  temperatur NUMERIC(4,1),
  blutzucker NUMERIC(5,1),
  gewicht NUMERIC(5,2),
  sauerstoff INT,
  notiz TEXT
);

-- AI analysis results cache
CREATE TABLE IF NOT EXISTS ki_tagebuch_analysen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  analyse_datum DATE DEFAULT CURRENT_DATE,
  zeitraum_von DATE,
  zeitraum_bis DATE,
  muster JSONB,      -- detected patterns
  warnungen JSONB,   -- alerts/concerns
  empfehlungen JSONB,
  erstellt_am TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE pflegetagebuch_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitalwerte_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ki_tagebuch_analysen ENABLE ROW LEVEL SECURITY;

-- pflegetagebuch_v2 policies
CREATE POLICY "pflegetagebuch_v2_select_own"
  ON pflegetagebuch_v2 FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "pflegetagebuch_v2_insert_own"
  ON pflegetagebuch_v2 FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "pflegetagebuch_v2_update_own"
  ON pflegetagebuch_v2 FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "pflegetagebuch_v2_delete_own"
  ON pflegetagebuch_v2 FOR DELETE
  USING (user_id = auth.uid());

-- vitalwerte_log policies
CREATE POLICY "vitalwerte_log_select_own"
  ON vitalwerte_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "vitalwerte_log_insert_own"
  ON vitalwerte_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "vitalwerte_log_update_own"
  ON vitalwerte_log FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "vitalwerte_log_delete_own"
  ON vitalwerte_log FOR DELETE
  USING (user_id = auth.uid());

-- ki_tagebuch_analysen policies
CREATE POLICY "ki_tagebuch_analysen_select_own"
  ON ki_tagebuch_analysen FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "ki_tagebuch_analysen_insert_own"
  ON ki_tagebuch_analysen FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ki_tagebuch_analysen_update_own"
  ON ki_tagebuch_analysen FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "ki_tagebuch_analysen_delete_own"
  ON ki_tagebuch_analysen FOR DELETE
  USING (user_id = auth.uid());

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pflegetagebuch_v2_user_datum
  ON pflegetagebuch_v2 (user_id, datum DESC);

CREATE INDEX IF NOT EXISTS idx_pflegetagebuch_v2_user_kategorie
  ON pflegetagebuch_v2 (user_id, kategorie);

CREATE INDEX IF NOT EXISTS idx_pflegetagebuch_v2_besonderheit
  ON pflegetagebuch_v2 (user_id, besonderheit) WHERE besonderheit = true;

CREATE INDEX IF NOT EXISTS idx_vitalwerte_log_user_gemessen
  ON vitalwerte_log (user_id, gemessen_am DESC);

CREATE INDEX IF NOT EXISTS idx_ki_tagebuch_analysen_user_datum
  ON ki_tagebuch_analysen (user_id, analyse_datum DESC);

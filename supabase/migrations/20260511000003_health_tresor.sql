-- Medikamenten-Plan
CREATE TABLE IF NOT EXISTS medikamente (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id       uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  name            text NOT NULL,
  wirkstoff       text,
  staerke         text,
  darreichungsform text,
  morgens         numeric(4,2) DEFAULT 0,
  mittags         numeric(4,2) DEFAULT 0,
  abends          numeric(4,2) DEFAULT 0,
  nachts          numeric(4,2) DEFAULT 0,
  einheit         text DEFAULT 'Tablette',
  hinweis         text,
  verordnet_von   text,
  seit_datum      date,
  bis_datum       date,
  aktiv           boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Diagnosen
CREATE TABLE IF NOT EXISTS diagnosen (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id       uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  icd10_code      text,
  bezeichnung     text NOT NULL,
  erstdiagnose    date,
  arzt            text,
  notizen         text,
  chronisch       boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

-- Impfungen
CREATE TABLE IF NOT EXISTS impfungen (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id       uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  impfstoff       text NOT NULL,
  krankheit       text NOT NULL,
  datum           date NOT NULL,
  naechste_impfung date,
  arzt            text,
  charge          text,
  created_at      timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE medikamente ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosen ENABLE ROW LEVEL SECURITY;
ALTER TABLE impfungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "med_eigene" ON medikamente FOR ALL USING (profil_id = auth.uid());
CREATE POLICY "diag_eigene" ON diagnosen FOR ALL USING (profil_id = auth.uid());
CREATE POLICY "impf_eigene" ON impfungen FOR ALL USING (profil_id = auth.uid());

CREATE POLICY "admin_med" ON medikamente FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_diag" ON diagnosen FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_impf" ON impfungen FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_medikamente_profil ON medikamente(profil_id);
CREATE INDEX IF NOT EXISTS idx_diagnosen_profil ON diagnosen(profil_id);
CREATE INDEX IF NOT EXISTS idx_impfungen_profil ON impfungen(profil_id);

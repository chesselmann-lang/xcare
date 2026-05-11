-- Phase 8A: Medikamentenplan
CREATE TABLE IF NOT EXISTS medikamentenplaene (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familie_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  anbieter_id uuid REFERENCES anbieter(id) ON DELETE SET NULL,
  erstellt_von uuid REFERENCES profiles(id) ON DELETE SET NULL,
  medikament_name text NOT NULL,
  wirkstoff text,
  staerke text,
  darreichungsform text,
  dosierung_morgens numeric(6,2),
  dosierung_mittags numeric(6,2),
  dosierung_abends numeric(6,2),
  dosierung_nachts numeric(6,2),
  einheit text DEFAULT 'Tablette(n)',
  mit_mahlzeit boolean DEFAULT false,
  dauermedikation boolean DEFAULT true,
  von_datum date,
  bis_datum date,
  verordnet_von text,
  indikation text,
  hinweise text,
  aktiv boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Phase 8B: Wundversorgung
CREATE TABLE IF NOT EXISTS wundversorgungen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wunde_id uuid, -- self-referencing: folgedokumentation derselben Wunde
  familie_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  anbieter_id uuid REFERENCES anbieter(id) ON DELETE SET NULL,
  dokumentiert_von uuid REFERENCES profiles(id) ON DELETE SET NULL,
  lokalisation text NOT NULL,
  wundart text DEFAULT 'sonstige'
    CHECK (wundart IN ('dekubitus','ulcus_cruris','diabetisches_fusssyndrom','traumatisch','operativ','sonstige')),
  wundgroesse_cm2 numeric(8,2),
  tiefe_grad int CHECK (tiefe_grad BETWEEN 1 AND 4),
  wundzustand text
    CHECK (wundzustand IN ('granulierend','epithelisierend','nekrotisch','infiziert','exsudierend','trocken')),
  exsudat text CHECK (exsudat IN ('kein','gering','maessig','stark')),
  wundrand text,
  massnahmen text,
  verbandsmaterial text,
  naechster_verbandwechsel date,
  schmerz_nrs int CHECK (schmerz_nrs BETWEEN 0 AND 10),
  foto_url text,
  notizen text,
  created_at timestamptz DEFAULT now()
);

-- RLS for medikamentenplaene
ALTER TABLE medikamentenplaene ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Familie liest eigene Medikamente" ON medikamentenplaene
  FOR SELECT USING (
    familie_profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Anbieter liest Medikamente ihrer Familien" ON medikamentenplaene
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'anbieter'
    )
  );

CREATE POLICY "Familie schreibt eigene Medikamente" ON medikamentenplaene
  FOR INSERT WITH CHECK (
    familie_profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Anbieter schreibt Medikamente" ON medikamentenplaene
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'anbieter'
    )
  );

CREATE POLICY "Familie aktualisiert eigene Medikamente" ON medikamentenplaene
  FOR UPDATE USING (
    familie_profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Anbieter aktualisiert Medikamente" ON medikamentenplaene
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'anbieter'
    )
  );

-- RLS for wundversorgungen
ALTER TABLE wundversorgungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Familie liest eigene Wundversorgungen" ON wundversorgungen
  FOR SELECT USING (
    familie_profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Anbieter liest Wundversorgungen" ON wundversorgungen
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'anbieter'
    )
  );

CREATE POLICY "Anbieter schreibt Wundversorgungen" ON wundversorgungen
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'anbieter'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_medikamentenplaene_familie ON medikamentenplaene(familie_profile_id);
CREATE INDEX IF NOT EXISTS idx_medikamentenplaene_aktiv ON medikamentenplaene(aktiv);
CREATE INDEX IF NOT EXISTS idx_wundversorgungen_familie ON wundversorgungen(familie_profile_id);
CREATE INDEX IF NOT EXISTS idx_wundversorgungen_wunde ON wundversorgungen(wunde_id);

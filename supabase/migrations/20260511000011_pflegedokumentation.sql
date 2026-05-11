-- ============================================================
-- Phase 6A: Digitale Pflegedokumentation
-- Verlaufsnotizen, Vitalwerte, Medikamente — MDK-konform.
-- ============================================================

-- ---------------------------------------------------------
-- 1. Pflegedokumentation — Verlaufsnotizen
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS pflegedokumentation (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id       uuid NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  care_worker_id    uuid REFERENCES care_workers(id) ON DELETE SET NULL,
  familie_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  -- Inhalt
  kategorie         text NOT NULL
                    CHECK (kategorie IN (
                      'allgemein','koerperpflege','ernaehrung','mobilität',
                      'medikamente','vitalwerte','wunde','psychosozial','sonstiges'
                    )),
  titel             text,
  inhalt            text NOT NULL,
  -- Datum/Zeit des Ereignisses (nicht zwingend created_at)
  ereignis_datum    timestamptz NOT NULL DEFAULT now(),
  -- Vitalwerte (optional, nur bei kategorie='vitalwerte')
  blutdruck_sys     int,   -- mmHg
  blutdruck_dia     int,   -- mmHg
  puls              int,   -- bpm
  temperatur        numeric(4,1),  -- °C
  gewicht           numeric(5,1),  -- kg
  blutzucker        int,   -- mg/dL
  sauerstoff        int,   -- % SpO2
  -- Medikamente (optional, nur bei kategorie='medikamente')
  medikament_name   text,
  medikament_dosis  text,
  medikament_gegeben boolean DEFAULT false,
  -- Signatur
  unterschrieben    boolean NOT NULL DEFAULT false,
  unterschrift_ts   timestamptz,
  -- Metadaten
  erstellt_von      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON pflegedokumentation (anbieter_id, ereignis_datum DESC);
CREATE INDEX ON pflegedokumentation (familie_profile_id, ereignis_datum DESC);
CREATE INDEX ON pflegedokumentation (care_worker_id);
CREATE INDEX ON pflegedokumentation (kategorie, ereignis_datum DESC);

ALTER TABLE pflegedokumentation ENABLE ROW LEVEL SECURITY;

-- Anbieter verwaltet eigene Dokumentation
CREATE POLICY "anbieter_manage_doku"
  ON pflegedokumentation FOR ALL
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Familie liest eigene Dokumentation (schreibgeschützt)
CREATE POLICY "familie_read_doku"
  ON pflegedokumentation FOR SELECT
  USING (
    familie_profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Admin liest alles
CREATE POLICY "admin_doku"
  ON pflegedokumentation FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE TRIGGER pflegedoku_updated_at
  BEFORE UPDATE ON pflegedokumentation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------
-- 2. Medikamenten-Plan (dauerhafter Plan, kein Einzel-Eintrag)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS medikamenten_plan (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id       uuid NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  familie_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medikament        text NOT NULL,
  wirkstoff         text,
  dosis             text NOT NULL,         -- z.B. "1 Tablette"
  einheit           text,                  -- mg, ml, etc.
  zeiten            text[] NOT NULL,       -- ['morgens','mittags','abends','nachts']
  mit_mahlzeit      boolean DEFAULT false,
  hinweis           text,
  aktiv             boolean NOT NULL DEFAULT true,
  verordnet_von     text,                  -- Arztname
  verordnet_am      date,
  valid_until       date,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON medikamenten_plan (familie_profile_id, aktiv);
CREATE INDEX ON medikamenten_plan (anbieter_id);

ALTER TABLE medikamenten_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_manage_medplan"
  ON medikamenten_plan FOR ALL
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "familie_read_medplan"
  ON medikamenten_plan FOR SELECT
  USING (
    familie_profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admin_medplan"
  ON medikamenten_plan FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------
-- 3. Wundversorgung-Dokumentation
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS wundversorgung (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id       uuid NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  familie_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  care_worker_id    uuid REFERENCES care_workers(id) ON DELETE SET NULL,
  wundlokalisation  text NOT NULL,        -- z.B. "Linke Ferse"
  wundgroesse_cm    numeric(5,2),
  wundtiefe         text CHECK (wundtiefe IN ('oberflächlich','mittel','tief','kavitär')),
  wundstadium       int CHECK (wundstadium BETWEEN 1 AND 4),  -- Dekubitus-Stadien
  wundbehandlung    text,                  -- Verbandmaterial etc.
  heilungsverlauf   text CHECK (heilungsverlauf IN ('verbessert','stabil','verschlechtert')),
  foto_url          text,
  naechste_kontrolle date,
  ereignis_datum    timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON wundversorgung (familie_profile_id, ereignis_datum DESC);
CREATE INDEX ON wundversorgung (anbieter_id);

ALTER TABLE wundversorgung ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_manage_wund"
  ON wundversorgung FOR ALL
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "familie_read_wund"
  ON wundversorgung FOR SELECT
  USING (
    familie_profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admin_wund"
  ON wundversorgung FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------
-- 4. Hilfsfunktion: Vitalwert-Trendanalyse für Familie
-- ---------------------------------------------------------
CREATE OR REPLACE VIEW vitalwert_verlauf AS
SELECT
  familie_profile_id,
  anbieter_id,
  DATE(ereignis_datum) AS datum,
  AVG(blutdruck_sys) FILTER (WHERE blutdruck_sys IS NOT NULL) AS avg_sys,
  AVG(blutdruck_dia) FILTER (WHERE blutdruck_dia IS NOT NULL) AS avg_dia,
  AVG(puls) FILTER (WHERE puls IS NOT NULL) AS avg_puls,
  AVG(temperatur) FILTER (WHERE temperatur IS NOT NULL) AS avg_temp,
  AVG(gewicht) FILTER (WHERE gewicht IS NOT NULL) AS avg_gewicht,
  AVG(blutzucker) FILTER (WHERE blutzucker IS NOT NULL) AS avg_blutzucker,
  COUNT(*) FILTER (WHERE kategorie = 'vitalwerte') AS anzahl_messungen
FROM pflegedokumentation
WHERE kategorie = 'vitalwerte'
  AND familie_profile_id IS NOT NULL
GROUP BY familie_profile_id, anbieter_id, DATE(ereignis_datum)
ORDER BY datum DESC;

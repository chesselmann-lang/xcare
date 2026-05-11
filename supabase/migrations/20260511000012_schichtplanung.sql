-- ============================================================
-- Phase 6B: Schichtplanung für Care-Worker
-- Wochenplan, Schichtzuweisung, iCal-Export
-- ============================================================

-- ---------------------------------------------------------
-- 1. Schichten (einzelne Arbeitseinsätze)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS schichten (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id       uuid NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  care_worker_id    uuid NOT NULL REFERENCES care_workers(id) ON DELETE CASCADE,
  familie_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  -- Zeitraum
  start_ts          timestamptz NOT NULL,
  ende_ts           timestamptz NOT NULL,
  -- Details
  titel             text,                          -- z.B. "Morgenrunde", "Nachtschicht"
  beschreibung      text,
  schichttyp        text NOT NULL DEFAULT 'standard'
                    CHECK (schichttyp IN ('standard','nacht','bereitschaft','springerdienst')),
  -- Status-Tracking
  status            text NOT NULL DEFAULT 'geplant'
                    CHECK (status IN ('geplant','bestaetigt','abgesagt','abgeschlossen')),
  bestaetigt_am     timestamptz,
  abgesagt_am       timestamptz,
  absage_grund      text,
  -- Abrechnung
  stunden_geplant   numeric(5,2) GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (ende_ts - start_ts)) / 3600
  ) STORED,
  stundensatz_ct    int,                           -- überschreibt care_worker default
  -- Metadaten
  erstellt_von      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schicht_ende_nach_start CHECK (ende_ts > start_ts)
);

CREATE INDEX ON schichten (anbieter_id, start_ts);
CREATE INDEX ON schichten (care_worker_id, start_ts);
CREATE INDEX ON schichten (familie_profile_id, start_ts);
CREATE INDEX ON schichten (status, start_ts);

ALTER TABLE schichten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_manage_schichten"
  ON schichten FOR ALL
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "care_worker_read_schichten"
  ON schichten FOR SELECT
  USING (
    care_worker_id IN (
      SELECT id FROM care_workers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "familie_read_schichten"
  ON schichten FOR SELECT
  USING (
    familie_profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admin_schichten"
  ON schichten FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE TRIGGER schichten_updated_at
  BEFORE UPDATE ON schichten
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------
-- 2. Wochenpläne (Vorlage für wiederkehrende Muster)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS wochenplaene (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id       uuid NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  care_worker_id    uuid NOT NULL REFERENCES care_workers(id) ON DELETE CASCADE,
  familie_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name              text NOT NULL,                 -- z.B. "Regelschicht Muster"
  gueltig_ab        date NOT NULL DEFAULT CURRENT_DATE,
  gueltig_bis       date,
  -- JSONB-Array von {wochentag: 0-6, start_uhrzeit: "08:00", end_uhrzeit: "14:00", schichttyp: "standard"}
  muster            jsonb NOT NULL DEFAULT '[]',
  aktiv             boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON wochenplaene (care_worker_id, gueltig_ab);
CREATE INDEX ON wochenplaene (anbieter_id);

ALTER TABLE wochenplaene ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_manage_wochenplaene"
  ON wochenplaene FOR ALL
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_wochenplaene"
  ON wochenplaene FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------
-- 3. Schicht-Konflikte View (Überschneidungen)
-- ---------------------------------------------------------
CREATE OR REPLACE VIEW schicht_konflikte AS
SELECT
  s1.id AS schicht_a_id,
  s2.id AS schicht_b_id,
  s1.care_worker_id,
  s1.start_ts AS a_start,
  s1.ende_ts  AS a_ende,
  s2.start_ts AS b_start,
  s2.ende_ts  AS b_ende
FROM schichten s1
JOIN schichten s2
  ON s1.care_worker_id = s2.care_worker_id
  AND s1.id < s2.id
  AND s1.start_ts < s2.ende_ts
  AND s1.ende_ts  > s2.start_ts
  AND s1.status NOT IN ('abgesagt')
  AND s2.status NOT IN ('abgesagt');

-- ---------------------------------------------------------
-- 4. Wochenübersicht View
-- ---------------------------------------------------------
CREATE OR REPLACE VIEW schichten_wochenuebersicht AS
SELECT
  s.anbieter_id,
  DATE_TRUNC('week', s.start_ts) AS kalenderwoche,
  s.care_worker_id,
  cw.vorname || ' ' || cw.nachname AS care_worker_name,
  COUNT(*) AS anzahl_schichten,
  SUM(s.stunden_geplant) AS geplante_stunden,
  SUM(CASE WHEN s.status = 'abgeschlossen' THEN s.stunden_geplant ELSE 0 END) AS geleistete_stunden,
  SUM(CASE WHEN s.status = 'abgesagt' THEN 1 ELSE 0 END) AS absagen
FROM schichten s
JOIN care_workers cw ON cw.id = s.care_worker_id
GROUP BY s.anbieter_id, DATE_TRUNC('week', s.start_ts), s.care_worker_id, cw.vorname, cw.nachname;

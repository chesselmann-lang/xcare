-- ============================================================
-- Phase 6C: Qualitätssicherung & MDK-Compliance
-- ============================================================

-- ---------------------------------------------------------
-- 1. Qualitätsprüfungen (MDK-Besuche, interne Audits)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS qualitaetspruefungen (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id       uuid NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  pruefung_typ      text NOT NULL
                    CHECK (pruefung_typ IN ('mdk_pruefung','interne_revision','pflegevisit','sonstige')),
  pruefung_datum    date NOT NULL,
  naechste_pruefung date,
  ergebnis          text CHECK (ergebnis IN ('sehr_gut','gut','befriedigend','ausreichend','mangelhaft')),
  note_gesamt       numeric(3,1) CHECK (note_gesamt BETWEEN 1.0 AND 5.0),
  bericht_url       text,              -- Link zu PDF-Bericht
  massnahmen        text,              -- Auflagen / Nachbesserungen
  abgeschlossen     boolean NOT NULL DEFAULT false,
  erstellt_von      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON qualitaetspruefungen (anbieter_id, pruefung_datum DESC);

ALTER TABLE qualitaetspruefungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_manage_pruefungen"
  ON qualitaetspruefungen FOR ALL
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_pruefungen"
  ON qualitaetspruefungen FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE TRIGGER qualitaet_updated_at
  BEFORE UPDATE ON qualitaetspruefungen
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------
-- 2. Beschwerde-Management
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS beschwerden (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id       uuid NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  familie_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  -- Klassifizierung
  kategorie         text NOT NULL
                    CHECK (kategorie IN ('pflege','kommunikation','abrechnung','personal','sonstiges')),
  schweregrad       text NOT NULL DEFAULT 'mittel'
                    CHECK (schweregrad IN ('niedrig','mittel','hoch','kritisch')),
  status            text NOT NULL DEFAULT 'offen'
                    CHECK (status IN ('offen','in_bearbeitung','geloest','eskaliert')),
  -- Inhalt
  beschreibung      text NOT NULL,
  massnahmen        text,
  ergebnis          text,
  -- Fristen (§ 75 SGB XI: 4-Wochen-Frist)
  eingegangen_am    date NOT NULL DEFAULT CURRENT_DATE,
  frist_am          date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '28 days'),
  geloest_am        date,
  -- Meta
  erstellt_von      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON beschwerden (anbieter_id, status, eingegangen_am DESC);

ALTER TABLE beschwerden ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_manage_beschwerden"
  ON beschwerden FOR ALL
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_beschwerden"
  ON beschwerden FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE TRIGGER beschwerden_updated_at
  BEFORE UPDATE ON beschwerden
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------
-- 3. Compliance-Checklisten-Items (MDK-Prüfkatalog)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS compliance_checks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id       uuid NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  bereich           text NOT NULL    -- z.B. "SGB XI §113", "Pflegedoku", "Hygiene"
                    CHECK (bereich IN (
                      'pflegedoku','hygiene','medikamente','wundversorgung',
                      'sturzpraevention','ernaehrung','personal','datenschutz'
                    )),
  kriterium         text NOT NULL,   -- Beschreibung des Kriteriums
  erfuellt          boolean,         -- null = nicht geprüft
  nachweis          text,            -- Freitext / Dokumentenverweis
  letzte_pruefung   date,
  faellig_am        date,
  erstellt_von      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON compliance_checks (anbieter_id, bereich);
CREATE INDEX ON compliance_checks (anbieter_id, faellig_am);

ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_manage_compliance"
  ON compliance_checks FOR ALL
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_compliance"
  ON compliance_checks FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE TRIGGER compliance_updated_at
  BEFORE UPDATE ON compliance_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------
-- 4. MDK-Compliance-Übersicht View
-- ---------------------------------------------------------
CREATE OR REPLACE VIEW mdk_compliance_uebersicht AS
SELECT
  a.id AS anbieter_id,
  a.name AS anbieter_name,
  -- Dokumentations-Vollständigkeit
  COUNT(pd.id) AS doku_eintraege_90d,
  COUNT(pd.id) FILTER (WHERE pd.unterschrieben) AS doku_signiert_90d,
  COUNT(DISTINCT pd.familie_profile_id) AS betreute_personen,
  -- Qualitätsprüfungen
  MAX(qp.pruefung_datum) AS letzte_mdk_pruefung,
  MAX(qp.note_gesamt) FILTER (WHERE qp.pruefung_typ = 'mdk_pruefung') AS letzter_mdk_note,
  -- Beschwerden
  COUNT(b.id) FILTER (WHERE b.status = 'offen') AS offene_beschwerden,
  COUNT(b.id) FILTER (WHERE b.schweregrad = 'kritisch' AND b.status != 'geloest') AS kritische_beschwerden,
  -- Compliance-Checks
  COUNT(cc.id) FILTER (WHERE cc.erfuellt = true) AS checks_erfuellt,
  COUNT(cc.id) AS checks_gesamt,
  COUNT(cc.id) FILTER (WHERE cc.faellig_am <= CURRENT_DATE AND (cc.erfuellt IS NULL OR cc.erfuellt = false)) AS ueberfaellige_checks
FROM anbieter a
LEFT JOIN pflegedokumentation pd
  ON pd.anbieter_id = a.id
  AND pd.ereignis_datum >= NOW() - INTERVAL '90 days'
LEFT JOIN qualitaetspruefungen qp ON qp.anbieter_id = a.id
LEFT JOIN beschwerden b ON b.anbieter_id = a.id
LEFT JOIN compliance_checks cc ON cc.anbieter_id = a.id
GROUP BY a.id, a.name;

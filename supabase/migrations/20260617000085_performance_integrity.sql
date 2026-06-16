-- Migration 085: Performance & Integrity Hardening
-- CHECK-Constraints, Composite-Indexes, Trigger, Materialized View

-- ============================================================
-- 1. CHECK-Constraints auf medizinischen Wertspalten
-- ============================================================
ALTER TABLE schmerz_eintraege
  ADD CONSTRAINT chk_nrs_wert CHECK (nrs_wert >= 0 AND nrs_wert <= 10);

ALTER TABLE schmerz_assessments
  ADD CONSTRAINT chk_zielwert_nrs CHECK (zielwert_nrs >= 0 AND zielwert_nrs <= 10);

ALTER TABLE gewichts_eintraege
  ADD CONSTRAINT chk_gewicht_plausibel CHECK (gewicht_kg > 0 AND gewicht_kg < 500);

ALTER TABLE vitalwerte_eintraege
  ADD CONSTRAINT chk_blutdruck_systolisch CHECK (
    blutdruck_systolisch IS NULL OR (blutdruck_systolisch >= 50 AND blutdruck_systolisch <= 300)
  ),
  ADD CONSTRAINT chk_blutdruck_diastolisch CHECK (
    blutdruck_diastolisch IS NULL OR (blutdruck_diastolisch >= 20 AND blutdruck_diastolisch <= 200)
  ),
  ADD CONSTRAINT chk_herzfrequenz CHECK (
    herzfrequenz IS NULL OR (herzfrequenz >= 20 AND herzfrequenz <= 300)
  ),
  ADD CONSTRAINT chk_temperatur CHECK (
    temperatur IS NULL OR (temperatur >= 30 AND temperatur <= 45)
  ),
  ADD CONSTRAINT chk_sauerstoffsaettigung CHECK (
    sauerstoffsaettigung IS NULL OR (sauerstoffsaettigung >= 50 AND sauerstoffsaettigung <= 100)
  );

ALTER TABLE sturz_ereignisse
  ADD CONSTRAINT chk_sturz_schweregrad CHECK (
    schweregrad IS NULL OR schweregrad IN ('leicht', 'mittel', 'schwer', 'kritisch')
  );

-- ============================================================
-- 2. Composite-Indexes für Verlaufsabfragen (bewohner_id + datum DESC)
-- ============================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schmerz_eintraege_bewohner_datum
  ON schmerz_eintraege (bewohner_id, datum DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gewichts_eintraege_bewohner_datum
  ON gewichts_eintraege (bewohner_id, datum DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vitalwerte_eintraege_bewohner_datum
  ON vitalwerte_eintraege (bewohner_id, datum DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sturz_ereignisse_bewohner_datum
  ON sturz_ereignisse (bewohner_id, datum DESC);

-- Anbieter-scoped Abfragen
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schmerz_eintraege_anbieter
  ON schmerz_eintraege (anbieter_id, bewohner_id, datum DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gewichts_eintraege_anbieter
  ON gewichts_eintraege (anbieter_id, bewohner_id, datum DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vitalwerte_anbieter
  ON vitalwerte_eintraege (anbieter_id, bewohner_id, datum DESC);

-- ============================================================
-- 3. updated_at-Trigger auf bisher fehlenden Tabellen
-- ============================================================
-- Sicherstellen dass die Funktion existiert
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- bewohner_normwerte
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bewohner_normwerte') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_bewohner_normwerte'
    ) THEN
      CREATE TRIGGER set_updated_at_bewohner_normwerte
        BEFORE UPDATE ON bewohner_normwerte
        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
    END IF;
  END IF;
END $$;

-- schmerz_assessments
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schmerz_assessments') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_schmerz_assessments'
    ) THEN
      CREATE TRIGGER set_updated_at_schmerz_assessments
        BEFORE UPDATE ON schmerz_assessments
        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
    END IF;
  END IF;
END $$;

-- ============================================================
-- 4. Partial Indexes für häufige Filter-Queries
-- ============================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bewohner_aktiv
  ON bewohner (anbieter_id, nachname)
  WHERE deleted_at IS NULL;

-- Schmerz-Einträge der letzten 90 Tage (häufigste Abfrage)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schmerz_recent
  ON schmerz_eintraege (bewohner_id, datum DESC)
  WHERE datum >= (CURRENT_DATE - INTERVAL '90 days');

-- ============================================================
-- 5. Materialized View: Bewohner-Protokoll-Statistiken
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_bewohner_protokoll_stats AS
SELECT
  b.id                                                        AS bewohner_id,
  b.anbieter_id,
  -- Schmerz
  COUNT(se.id)                                                AS schmerz_eintraege_gesamt,
  AVG(se.nrs_wert)::numeric(4,1)                             AS schmerz_nrs_mittelwert,
  MAX(se.nrs_wert)                                            AS schmerz_nrs_max,
  MAX(se.datum)                                               AS schmerz_letzter_eintrag,
  -- Gewicht
  COUNT(ge.id)                                                AS gewichts_messungen_gesamt,
  (
    SELECT ge2.gewicht_kg
    FROM gewichts_eintraege ge2
    WHERE ge2.bewohner_id = b.id
    ORDER BY ge2.datum DESC LIMIT 1
  )                                                           AS aktuelles_gewicht_kg,
  -- Vitalwerte
  COUNT(ve.id)                                                AS vital_messungen_gesamt,
  MAX(ve.datum)                                               AS vital_letzte_messung,
  -- Sturzprotokoll
  COUNT(sturz.id)                                             AS sturz_ereignisse_gesamt,
  SUM(CASE WHEN sturz.datum >= CURRENT_DATE - 30 THEN 1 ELSE 0 END) AS sturz_letzte_30_tage
FROM
  bewohner b
  LEFT JOIN schmerz_eintraege se    ON se.bewohner_id = b.id
  LEFT JOIN gewichts_eintraege ge   ON ge.bewohner_id = b.id
  LEFT JOIN vitalwerte_eintraege ve ON ve.bewohner_id = b.id
  LEFT JOIN sturz_ereignisse sturz  ON sturz.bewohner_id = b.id
WHERE
  b.deleted_at IS NULL
GROUP BY
  b.id, b.anbieter_id
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_bewohner_protokoll_stats_pk
  ON mv_bewohner_protokoll_stats (bewohner_id);

COMMENT ON MATERIALIZED VIEW mv_bewohner_protokoll_stats IS
  'Aggregierte Protokoll-Statistiken pro Bewohner. Täglich via pg_cron refreshen: SELECT cron.schedule($$bewohner-stats-refresh$$, $$0 3 * * *$$, $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_bewohner_protokoll_stats$$);';

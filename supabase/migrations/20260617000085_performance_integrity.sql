-- ============================================================
-- Phase 3: Performance-Indizes + Daten-Integrität
-- Basis: Echte Tabellennamen und Spalten aus der DB
-- ============================================================

-- ---- 1. CHECK-Constraints (idempotent via IF NOT EXISTS in pg_constraint) ----

-- schmerz_eintraege.nrs_wert (0-10)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_schmerz_nrs_wert' AND conrelid='schmerz_eintraege'::regclass) THEN
    ALTER TABLE schmerz_eintraege ADD CONSTRAINT chk_schmerz_nrs_wert CHECK (nrs_wert IS NULL OR (nrs_wert >= 0 AND nrs_wert <= 10));
  END IF;
END $$;

-- schmerz_therapieplaene.ziel_nrs (0-10)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_ziel_nrs' AND conrelid='schmerz_therapieplaene'::regclass) THEN
    ALTER TABLE schmerz_therapieplaene ADD CONSTRAINT chk_ziel_nrs CHECK (ziel_nrs IS NULL OR (ziel_nrs >= 0 AND ziel_nrs <= 10));
  END IF;
END $$;

-- vitalzeichen: physiologische Plausibilitaetsgrenzen
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_vz_blutdruck_sys' AND conrelid='vitalzeichen'::regclass) THEN
    ALTER TABLE vitalzeichen ADD CONSTRAINT chk_vz_blutdruck_sys CHECK (blutdruck_systolisch IS NULL OR (blutdruck_systolisch >= 50 AND blutdruck_systolisch <= 300));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_vz_blutdruck_dia' AND conrelid='vitalzeichen'::regclass) THEN
    ALTER TABLE vitalzeichen ADD CONSTRAINT chk_vz_blutdruck_dia CHECK (blutdruck_diastolisch IS NULL OR (blutdruck_diastolisch >= 20 AND blutdruck_diastolisch <= 200));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_vz_puls' AND conrelid='vitalzeichen'::regclass) THEN
    ALTER TABLE vitalzeichen ADD CONSTRAINT chk_vz_puls CHECK (puls IS NULL OR (puls >= 20 AND puls <= 300));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_vz_temperatur' AND conrelid='vitalzeichen'::regclass) THEN
    ALTER TABLE vitalzeichen ADD CONSTRAINT chk_vz_temperatur CHECK (temperatur IS NULL OR (temperatur >= 30 AND temperatur <= 45));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_vz_spo2' AND conrelid='vitalzeichen'::regclass) THEN
    ALTER TABLE vitalzeichen ADD CONSTRAINT chk_vz_spo2 CHECK (spo2 IS NULL OR (spo2 >= 50 AND spo2 <= 100));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_vz_schmerz_nrs' AND conrelid='vitalzeichen'::regclass) THEN
    ALTER TABLE vitalzeichen ADD CONSTRAINT chk_vz_schmerz_nrs CHECK (schmerz_nrs IS NULL OR (schmerz_nrs >= 0 AND schmerz_nrs <= 10));
  END IF;
END $$;

-- vitalwerte_log: Plausibilitaetsgrenzen
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_vl_blutdruck_sys' AND conrelid='vitalwerte_log'::regclass) THEN
    ALTER TABLE vitalwerte_log ADD CONSTRAINT chk_vl_blutdruck_sys CHECK (blutdruck_sys IS NULL OR (blutdruck_sys >= 50 AND blutdruck_sys <= 300));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_vl_blutdruck_dia' AND conrelid='vitalwerte_log'::regclass) THEN
    ALTER TABLE vitalwerte_log ADD CONSTRAINT chk_vl_blutdruck_dia CHECK (blutdruck_dia IS NULL OR (blutdruck_dia >= 20 AND blutdruck_dia <= 200));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_vl_puls' AND conrelid='vitalwerte_log'::regclass) THEN
    ALTER TABLE vitalwerte_log ADD CONSTRAINT chk_vl_puls CHECK (puls IS NULL OR (puls >= 20 AND puls <= 300));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_vl_temperatur' AND conrelid='vitalwerte_log'::regclass) THEN
    ALTER TABLE vitalwerte_log ADD CONSTRAINT chk_vl_temperatur CHECK (temperatur IS NULL OR (temperatur >= 30 AND temperatur <= 45));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_vl_sauerstoff' AND conrelid='vitalwerte_log'::regclass) THEN
    ALTER TABLE vitalwerte_log ADD CONSTRAINT chk_vl_sauerstoff CHECK (sauerstoff IS NULL OR (sauerstoff >= 50 AND sauerstoff <= 100));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_vl_gewicht' AND conrelid='vitalwerte_log'::regclass) THEN
    ALTER TABLE vitalwerte_log ADD CONSTRAINT chk_vl_gewicht CHECK (gewicht IS NULL OR (gewicht > 0 AND gewicht < 500));
  END IF;
END $$;

-- ---- 2. Performance-Indizes ----

CREATE INDEX IF NOT EXISTS idx_schmerz_eintraege_user_zeitpunkt ON schmerz_eintraege (user_id, zeitpunkt DESC);
CREATE INDEX IF NOT EXISTS idx_vitalzeichen_user_zeitpunkt ON vitalzeichen (user_id, zeitpunkt DESC);
CREATE INDEX IF NOT EXISTS idx_vitalwerte_log_user_gemessen ON vitalwerte_log (user_id, gemessen_am DESC);
CREATE INDEX IF NOT EXISTS idx_sturzereignis_user_datum ON sturzereignis (user_id, ereignis_datum DESC);
CREATE INDEX IF NOT EXISTS idx_bewohner_anbieter_status ON bewohner (anbieter_id, status);
CREATE INDEX IF NOT EXISTS idx_bewohner_anbieter_nachname ON bewohner (anbieter_id, nachname);
CREATE INDEX IF NOT EXISTS idx_schmerz_tp_user_aktiv ON schmerz_therapieplaene (user_id, aktiv);

-- ---- 3. updated_at Trigger-Funktion (universell) ----
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

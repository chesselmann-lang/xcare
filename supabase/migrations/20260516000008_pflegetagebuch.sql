-- ─────────────────────────────────────────────────────────────────────────────
-- S319: Pflegetagebuch mit Stimmungs-Tracker — additive Ergänzungen
--
-- Die pflegetagebuch-Tabelle wurde bereits in Migration 20260511000004_pflegeplan.sql
-- erstellt (mit profil_id + stimmung 1-5 + notizen etc.).
-- Diese Migration ergänzt nur den fehlenden updated_at-Trigger.
-- ─────────────────────────────────────────────────────────────────────────────

-- updated_at Trigger (falls noch nicht vorhanden)
CREATE OR REPLACE FUNCTION set_pflegetagebuch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger nur anlegen, wenn er noch nicht existiert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_pflegetagebuch_updated_at'
    AND tgrelid = 'pflegetagebuch'::regclass
  ) THEN
    CREATE TRIGGER trg_pflegetagebuch_updated_at
      BEFORE UPDATE ON pflegetagebuch
      FOR EACH ROW EXECUTE FUNCTION set_pflegetagebuch_updated_at();
  END IF;
END;
$$;

-- ============================================================
-- F43: Medikamenten-Manager
-- ============================================================

CREATE TABLE IF NOT EXISTS medikamente (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- Medikament
  name                TEXT NOT NULL,
  wirkstoff           TEXT,
  hersteller          TEXT,
  darreichungsform    TEXT CHECK (darreichungsform IN ('tablette','kapsel','tropfen','injektion','pflaster','salbe','spray','infusion','sonstiges')),
  staerke             TEXT,              -- z.B. "10 mg"
  -- Dosierung
  einheit             TEXT DEFAULT 'mg',
  dosis_morgen        NUMERIC(6,2) DEFAULT 0,
  dosis_mittag        NUMERIC(6,2) DEFAULT 0,
  dosis_abend         NUMERIC(6,2) DEFAULT 0,
  dosis_nacht         NUMERIC(6,2) DEFAULT 0,
  dosis_bedarf        BOOLEAN DEFAULT false,
  -- Zeitraum
  beginn_datum        DATE,
  ende_datum          DATE,
  dauerhaft           BOOLEAN DEFAULT false,
  -- Vorrat
  vorrat_stueck       INT DEFAULT 0,
  nachbestellung_ab   INT DEFAULT 7,     -- Warnung wenn Vorrat < X Tage
  -- Indikation & Hinweise
  indikation          TEXT,
  einnahmehinweis     TEXT,              -- z.B. "mit Mahlzeit"
  nebenwirkungen      TEXT,
  -- Verschreibung
  verschreibend_arzt  TEXT,
  rezept_datum        DATE,
  -- Status
  aktiv               BOOLEAN DEFAULT true,
  erstellt_am         TIMESTAMPTZ DEFAULT now(),
  aktualisiert_am     TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_medikamente_aktualisiert
  BEFORE UPDATE ON medikamente
  FOR EACH ROW EXECUTE FUNCTION public.entlastung_einstellungen_set_aktualisiert_am();

CREATE INDEX IF NOT EXISTS medikamente_user_aktiv_idx ON medikamente(user_id, aktiv);
ALTER TABLE medikamente ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "med_select" ON medikamente FOR SELECT USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "med_insert" ON medikamente FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "med_update" ON medikamente FOR UPDATE USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "med_delete" ON medikamente FOR DELETE USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Einnahme-Protokoll
CREATE TABLE IF NOT EXISTS medikament_einnahmen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medikament_id   UUID REFERENCES medikamente(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  einnahme_datum  DATE NOT NULL DEFAULT CURRENT_DATE,
  einnahme_zeit   TIMETZ,
  tageszeit       TEXT CHECK (tageszeit IN ('morgen','mittag','abend','nacht','bedarf')),
  dosis_ist       NUMERIC(6,2),
  genommen        BOOLEAN DEFAULT true,
  notiz           TEXT,
  erstellt_am     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS med_einnahmen_med_datum_idx ON medikament_einnahmen(medikament_id, einnahme_datum DESC);
CREATE INDEX IF NOT EXISTS med_einnahmen_user_datum_idx ON medikament_einnahmen(user_id, einnahme_datum DESC);
ALTER TABLE medikament_einnahmen ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "med_ein_select" ON medikament_einnahmen FOR SELECT USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "med_ein_insert" ON medikament_einnahmen FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "med_ein_update" ON medikament_einnahmen FOR UPDATE USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- F42: Pflegetagebuch (Care Diary)
-- ============================================================

CREATE TABLE IF NOT EXISTS pflegetagebuch (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- Zeitpunkt
  eintrag_datum   DATE NOT NULL DEFAULT CURRENT_DATE,
  eintrag_zeit    TIMETZ,
  -- Stimmung / Wohlbefinden (1-5 Skala)
  stimmung        INT CHECK (stimmung BETWEEN 1 AND 5),
  schmerz_level   INT CHECK (schmerz_level BETWEEN 0 AND 10),
  -- Vitalwerte
  blutdruck_sys   INT,
  blutdruck_dia   INT,
  puls            INT,
  temperatur      NUMERIC(4,1),
  blutzucker      NUMERIC(5,1),  -- mg/dL
  gewicht         NUMERIC(5,2),  -- kg
  sauerstoff      INT CHECK (sauerstoff BETWEEN 0 AND 100), -- SpO2 %
  -- Aktivitäten & Pflege
  aktivitaeten    TEXT[] DEFAULT '{}',
  pflegeleistungen TEXT[] DEFAULT '{}',
  -- Notizen
  notizen         TEXT,
  besonderheiten  TEXT,
  -- Stürze / Vorfälle
  sturz_ereignis  BOOLEAN DEFAULT false,
  sturz_beschr    TEXT,
  -- Medikamente eingenommen
  medikamente_ok  BOOLEAN,
  medikamente_notiz TEXT,
  -- Ausscheidung
  trinkmenge_ml   INT,
  mahlzeiten      INT CHECK (mahlzeiten BETWEEN 0 AND 5),
  -- Schlaf
  schlaf_stunden  NUMERIC(4,1),
  schlaf_qualitaet INT CHECK (schlaf_qualitaet BETWEEN 1 AND 5),
  -- Metadaten
  erstellt_am     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pflegetagebuch_user_datum_idx ON pflegetagebuch(user_id, eintrag_datum DESC);
ALTER TABLE pflegetagebuch ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ptb_select" ON pflegetagebuch FOR SELECT USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ptb_insert" ON pflegetagebuch FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ptb_update" ON pflegetagebuch FOR UPDATE USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ptb_delete" ON pflegetagebuch FOR DELETE USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

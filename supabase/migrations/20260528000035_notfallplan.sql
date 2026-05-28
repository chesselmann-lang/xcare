-- ============================================================
-- F41: Notfallplan & Notfallkarte
-- ============================================================

CREATE TABLE IF NOT EXISTS notfallplan (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  -- Persönliche Daten
  vollstaendiger_name         TEXT,
  geburtsdatum                DATE,
  blutgruppe                  TEXT CHECK (blutgruppe IN ('A+','A-','B+','B-','AB+','AB-','0+','0-','unbekannt')),
  -- Medizinische Informationen
  hauptdiagnosen              TEXT[] DEFAULT '{}',
  allergien                   TEXT[] DEFAULT '{}',
  unvertraeglichkeiten        TEXT[] DEFAULT '{}',
  implantate                  TEXT[] DEFAULT '{}',
  -- Notfall-Medikamente (vereinfachte Liste)
  notfall_medikamente         JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Behandlungswünsche
  reanimation_gewuenscht      BOOLEAN,
  patientenverfuegung_vorh    BOOLEAN DEFAULT false,
  patientenverfuegung_ort     TEXT,
  vorsorgevollmacht_vorh      BOOLEAN DEFAULT false,
  bevollmaechtigte_name       TEXT,
  bevollmaechtigte_telefon    TEXT,
  -- Notfallkontakte
  kontakt_1_name              TEXT,
  kontakt_1_telefon           TEXT,
  kontakt_1_relation          TEXT,
  kontakt_2_name              TEXT,
  kontakt_2_telefon           TEXT,
  kontakt_2_relation          TEXT,
  -- Hausarzt
  hausarzt_name               TEXT,
  hausarzt_telefon            TEXT,
  hausarzt_praxis             TEXT,
  -- Krankenkasse
  krankenkasse                TEXT,
  versicherungsnummer         TEXT,
  -- Metadaten
  karte_erstellt_am           TIMESTAMPTZ,
  erstellt_am                 TIMESTAMPTZ DEFAULT now(),
  aktualisiert_am             TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_notfallplan_aktualisiert
  BEFORE UPDATE ON notfallplan
  FOR EACH ROW EXECUTE FUNCTION public.entlastung_einstellungen_set_aktualisiert_am();

ALTER TABLE notfallplan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "np_select" ON notfallplan FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "np_insert" ON notfallplan FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "np_update" ON notfallplan FOR UPDATE USING ((SELECT auth.uid()) = user_id);

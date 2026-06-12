-- F65: Bewohner-Stammdaten (Heimbewohner-Verwaltung)
-- Vollständiges Bewohnerprofil für stationäre Pflegeeinrichtungen

CREATE TABLE IF NOT EXISTS bewohner (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id             UUID NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,

  -- Personendaten
  vorname                 TEXT NOT NULL CHECK (char_length(vorname) BETWEEN 1 AND 100),
  nachname                TEXT NOT NULL CHECK (char_length(nachname) BETWEEN 1 AND 100),
  geburtsdatum            DATE NOT NULL,
  geschlecht              TEXT CHECK (geschlecht IN ('maennlich', 'weiblich', 'divers', 'unbekannt')) DEFAULT 'unbekannt',
  geburtsort              TEXT CHECK (char_length(geburtsort) <= 200),
  staatsangehoerigkeit    TEXT CHECK (char_length(staatsangehoerigkeit) <= 100) DEFAULT 'deutsch',

  -- Einrichtungsdaten
  zimmer_nr               TEXT NOT NULL CHECK (char_length(zimmer_nr) BETWEEN 1 AND 20),
  station                 TEXT CHECK (char_length(station) <= 100),
  aufnahmedatum           DATE NOT NULL DEFAULT CURRENT_DATE,
  entlassdatum            DATE,
  status                  TEXT NOT NULL CHECK (status IN ('aktiv', 'beurlaubt', 'hospitalisiert', 'entlassen', 'verstorben')) DEFAULT 'aktiv',

  -- Pflegedaten
  pflegegrad              INTEGER CHECK (pflegegrad BETWEEN 1 AND 5),
  pflegegrad_seit         DATE,
  naechste_begutachtung   DATE,
  pflegeeinstufung_notiz  TEXT CHECK (char_length(pflegeeinstufung_notiz) <= 1000),

  -- Medizinische Kurzinformationen
  hauptdiagnosen          JSONB DEFAULT '[]'::jsonb,          -- [{code, bezeichnung}]
  allergien               JSONB DEFAULT '[]'::jsonb,          -- [{stoff, reaktion, schwere}]
  medikamenten_hinweis    TEXT CHECK (char_length(medikamenten_hinweis) <= 2000),
  ernaehrungsbesonderheiten TEXT CHECK (char_length(ernaehrungsbesonderheiten) <= 1000),

  -- Funktionsstatus
  mobilitaet              TEXT CHECK (mobilitaet IN ('selbststaendig', 'hilfsmittel', 'eingeschraenkt', 'bettlaegerig')) DEFAULT 'selbststaendig',
  kommunikation           TEXT CHECK (kommunikation IN ('uneingeschraenkt', 'eingeschraenkt', 'nonverbal', 'keine')) DEFAULT 'uneingeschraenkt',
  orientierung            TEXT CHECK (orientierung IN ('vollstaendig', 'eingeschraenkt', 'desorientiert')) DEFAULT 'vollstaendig',

  -- Kontaktdaten
  angehoerige             JSONB DEFAULT '[]'::jsonb,          -- [{name, beziehung, telefon, email, hauptansprechpartner}]
  notfallkontakt_name     TEXT CHECK (char_length(notfallkontakt_name) <= 200),
  notfallkontakt_telefon  TEXT CHECK (char_length(notfallkontakt_telefon) <= 50),
  rechtlicher_betreuer    TEXT CHECK (char_length(rechtlicher_betreuer) <= 300),

  -- Versicherung
  krankenkasse            TEXT CHECK (char_length(krankenkasse) <= 200),
  versicherungsnummer     TEXT CHECK (char_length(versicherungsnummer) <= 50),
  pflegekasse             TEXT CHECK (char_length(pflegekasse) <= 200),

  -- Zusatzinfos
  religion                TEXT CHECK (char_length(religion) <= 100),
  sprache                 TEXT CHECK (char_length(sprache) <= 100) DEFAULT 'Deutsch',
  notizen                 TEXT CHECK (char_length(notizen) <= 3000),

  -- Timestamps
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_bewohner_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_bewohner_updated_at
  BEFORE UPDATE ON bewohner
  FOR EACH ROW EXECUTE FUNCTION update_bewohner_updated_at();

-- RLS
ALTER TABLE bewohner ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_bewohner_select" ON bewohner FOR SELECT
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
    OR anbieter_id IN (
      SELECT tm.anbieter_id FROM team_members tm
      JOIN profiles p ON p.id = tm.profile_id
      WHERE p.user_id = auth.uid() AND tm.aktiv = true
    )
  );

CREATE POLICY "anbieter_bewohner_insert" ON bewohner FOR INSERT
  WITH CHECK (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "anbieter_bewohner_update" ON bewohner FOR UPDATE
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
    OR anbieter_id IN (
      SELECT tm.anbieter_id FROM team_members tm
      JOIN profiles p ON p.id = tm.profile_id
      WHERE p.user_id = auth.uid() AND tm.aktiv = true
    )
  );

CREATE POLICY "anbieter_bewohner_delete" ON bewohner FOR DELETE
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bewohner_anbieter_id    ON bewohner(anbieter_id);
CREATE INDEX IF NOT EXISTS idx_bewohner_status         ON bewohner(anbieter_id, status);
CREATE INDEX IF NOT EXISTS idx_bewohner_nachname       ON bewohner(anbieter_id, nachname);
CREATE INDEX IF NOT EXISTS idx_bewohner_zimmer         ON bewohner(anbieter_id, zimmer_nr);
CREATE INDEX IF NOT EXISTS idx_bewohner_pflegegrad     ON bewohner(anbieter_id, pflegegrad);

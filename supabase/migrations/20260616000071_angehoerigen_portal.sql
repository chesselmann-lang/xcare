-- F71: Angehörigen-Portal für Bewohner
-- Familienmitglieder können Pflegeupdates ihrer Angehörigen (Bewohner) einsehen

CREATE TABLE IF NOT EXISTS bewohner_angehoerige (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bewohner_id    UUID NOT NULL REFERENCES bewohner(id) ON DELETE CASCADE,
  anbieter_id    UUID NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  -- Kann ein registrierter Nutzer (profile_id) oder externe E-Mail sein
  profile_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email          TEXT NOT NULL,
  name           TEXT,
  beziehung      TEXT,  -- 'kind', 'partner', 'geschwister', 'sonstiges'
  -- Zugriffsrechte
  sieht_pflegebericht  BOOLEAN NOT NULL DEFAULT true,
  sieht_vitalwerte     BOOLEAN NOT NULL DEFAULT true,
  sieht_medikamente    BOOLEAN NOT NULL DEFAULT false,
  sieht_pflegeplanung  BOOLEAN NOT NULL DEFAULT false,
  -- Einladungs-Status
  eingeladen_am  TIMESTAMPTZ NOT NULL DEFAULT now(),
  angenommen_am  TIMESTAMPTZ,
  einladungs_token TEXT UNIQUE,
  aktiv          BOOLEAN NOT NULL DEFAULT true,
  erstellt_am    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tages-Updates vom Anbieter an Angehörige
CREATE TABLE IF NOT EXISTS bewohner_tagesupdates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bewohner_id    UUID NOT NULL REFERENCES bewohner(id) ON DELETE CASCADE,
  anbieter_id    UUID NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  erstellt_von   UUID REFERENCES profiles(id),
  datum          DATE NOT NULL DEFAULT CURRENT_DATE,
  allgemeinzustand TEXT NOT NULL DEFAULT 'gut',  -- 'sehr_gut','gut','mittel','schlecht'
  stimmung       TEXT,                           -- 'froelich','ruhig','unruhig','traurig'
  nachricht      TEXT,                           -- Freitext-Update
  aktivitaeten   TEXT[],                         -- ['spaziergang','malen','singen']
  mahlzeiten_ok  BOOLEAN,
  schlaf_ok      BOOLEAN,
  besonderheiten TEXT,
  sichtbar_fuer_angehoerige BOOLEAN NOT NULL DEFAULT true,
  erstellt_am    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bewohner_angehoerige_bewohner ON bewohner_angehoerige(bewohner_id);
CREATE INDEX IF NOT EXISTS idx_bewohner_angehoerige_profile ON bewohner_angehoerige(profile_id);
CREATE INDEX IF NOT EXISTS idx_bewohner_angehoerige_email ON bewohner_angehoerige(email);
CREATE INDEX IF NOT EXISTS idx_bewohner_angehoerige_token ON bewohner_angehoerige(einladungs_token);
CREATE INDEX IF NOT EXISTS idx_bewohner_tagesupdates_bewohner ON bewohner_tagesupdates(bewohner_id);
CREATE INDEX IF NOT EXISTS idx_bewohner_tagesupdates_datum ON bewohner_tagesupdates(datum DESC);

ALTER TABLE bewohner_angehoerige ENABLE ROW LEVEL SECURITY;
ALTER TABLE bewohner_tagesupdates ENABLE ROW LEVEL SECURITY;

-- Anbieter kann eigene Angehörige verwalten
CREATE POLICY "anbieter_manage_angehoerige" ON bewohner_angehoerige
  FOR ALL USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Angehöriger kann sich selbst sehen
CREATE POLICY "angehoeriger_see_self" ON bewohner_angehoerige
  FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Anbieter kann Tagesupdates schreiben
CREATE POLICY "anbieter_manage_tagesupdates" ON bewohner_tagesupdates
  FOR ALL USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Angehörige können Updates sehen (via Bewohner-Zugriff)
CREATE POLICY "angehoeriger_see_updates" ON bewohner_tagesupdates
  FOR SELECT USING (
    sichtbar_fuer_angehoerige = true
    AND bewohner_id IN (
      SELECT ba.bewohner_id FROM bewohner_angehoerige ba
      JOIN profiles p ON p.id = ba.profile_id
      WHERE p.user_id = auth.uid() AND ba.aktiv = true
    )
  );

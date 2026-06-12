-- F66: Tourenplanung für ambulante Dienste
-- Touren mit Kundeneinsätzen, Fahrer-Zuweisung und Zeitplanung

CREATE TABLE IF NOT EXISTS touren (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id     UUID NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  datum           DATE NOT NULL,
  name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  fahrer_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  fahrzeug        TEXT CHECK (char_length(fahrzeug) <= 100),
  status          TEXT NOT NULL CHECK (status IN ('geplant', 'aktiv', 'abgeschlossen', 'storniert')) DEFAULT 'geplant',
  start_ort       TEXT CHECK (char_length(start_ort) <= 300),
  end_ort         TEXT CHECK (char_length(end_ort) <= 300),
  geplante_km     NUMERIC(8,1),
  tatsaechliche_km NUMERIC(8,1),
  notizen         TEXT CHECK (char_length(notizen) <= 2000),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tour_einsaetze (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id               UUID NOT NULL REFERENCES touren(id) ON DELETE CASCADE,
  anbieter_id           UUID NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,

  -- Kunde (optional: Bewohner-Referenz oder manuelle Eingabe)
  bewohner_id           UUID REFERENCES bewohner(id) ON DELETE SET NULL,
  kunde_name            TEXT NOT NULL CHECK (char_length(kunde_name) BETWEEN 1 AND 200),
  kunde_adresse         TEXT NOT NULL CHECK (char_length(kunde_adresse) BETWEEN 1 AND 500),
  kunde_telefon         TEXT CHECK (char_length(kunde_telefon) <= 50),

  -- Zeitplanung
  geplante_ankunft      TIME NOT NULL,
  geplante_abfahrt      TIME NOT NULL,
  tatsaechliche_ankunft TIME,
  tatsaechliche_abfahrt TIME,

  -- Leistung
  leistungsart          TEXT CHECK (char_length(leistungsart) <= 200),
  leistungsminuten      INTEGER CHECK (leistungsminuten BETWEEN 1 AND 480),
  prioritaet            TEXT NOT NULL CHECK (prioritaet IN ('normal', 'hoch', 'dringend')) DEFAULT 'normal',
  qualifikation_noetig  TEXT CHECK (char_length(qualifikation_noetig) <= 100),

  -- Status
  status                TEXT NOT NULL CHECK (status IN ('geplant', 'angekommen', 'abgeschlossen', 'nicht_angetroffen', 'storniert')) DEFAULT 'geplant',
  abwesenheitsgrund     TEXT CHECK (char_length(abwesenheitsgrund) <= 500),
  pflegedokumentation   TEXT CHECK (char_length(pflegedokumentation) <= 3000),

  -- Reihenfolge
  reihenfolge           INTEGER NOT NULL DEFAULT 1,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers
CREATE OR REPLACE FUNCTION update_touren_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_touren_updated_at
  BEFORE UPDATE ON touren
  FOR EACH ROW EXECUTE FUNCTION update_touren_updated_at();

-- RLS touren
ALTER TABLE touren ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_touren_select" ON touren FOR SELECT
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a JOIN profiles p ON p.id = a.profile_id WHERE p.user_id = auth.uid()
      UNION
      SELECT tm.anbieter_id FROM team_members tm JOIN profiles p ON p.id = tm.profile_id WHERE p.user_id = auth.uid() AND tm.aktiv = true
    )
  );

CREATE POLICY "anbieter_touren_insert" ON touren FOR INSERT
  WITH CHECK (
    anbieter_id IN (
      SELECT a.id FROM anbieter a JOIN profiles p ON p.id = a.profile_id WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "anbieter_touren_update" ON touren FOR UPDATE
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a JOIN profiles p ON p.id = a.profile_id WHERE p.user_id = auth.uid()
      UNION
      SELECT tm.anbieter_id FROM team_members tm JOIN profiles p ON p.id = tm.profile_id WHERE p.user_id = auth.uid() AND tm.aktiv = true
    )
  );

CREATE POLICY "anbieter_touren_delete" ON touren FOR DELETE
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a JOIN profiles p ON p.id = a.profile_id WHERE p.user_id = auth.uid()
    )
  );

-- RLS tour_einsaetze
ALTER TABLE tour_einsaetze ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_einsaetze_select" ON tour_einsaetze FOR SELECT
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a JOIN profiles p ON p.id = a.profile_id WHERE p.user_id = auth.uid()
      UNION
      SELECT tm.anbieter_id FROM team_members tm JOIN profiles p ON p.id = tm.profile_id WHERE p.user_id = auth.uid() AND tm.aktiv = true
    )
  );

CREATE POLICY "anbieter_einsaetze_insert" ON tour_einsaetze FOR INSERT
  WITH CHECK (
    anbieter_id IN (
      SELECT a.id FROM anbieter a JOIN profiles p ON p.id = a.profile_id WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "anbieter_einsaetze_update" ON tour_einsaetze FOR UPDATE
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a JOIN profiles p ON p.id = a.profile_id WHERE p.user_id = auth.uid()
      UNION
      SELECT tm.anbieter_id FROM team_members tm JOIN profiles p ON p.id = tm.profile_id WHERE p.user_id = auth.uid() AND tm.aktiv = true
    )
  );

CREATE POLICY "anbieter_einsaetze_delete" ON tour_einsaetze FOR DELETE
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a JOIN profiles p ON p.id = a.profile_id WHERE p.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_touren_anbieter_datum   ON touren(anbieter_id, datum DESC);
CREATE INDEX IF NOT EXISTS idx_touren_fahrer           ON touren(fahrer_id);
CREATE INDEX IF NOT EXISTS idx_touren_status           ON touren(anbieter_id, status);
CREATE INDEX IF NOT EXISTS idx_tour_einsaetze_tour     ON tour_einsaetze(tour_id, reihenfolge);
CREATE INDEX IF NOT EXISTS idx_tour_einsaetze_bewohner ON tour_einsaetze(bewohner_id);

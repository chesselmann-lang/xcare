-- F75: Wochenbericht-Generator für Angehörige

CREATE TABLE IF NOT EXISTS bewohner_wochenberichte (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id           UUID NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  bewohner_id           UUID NOT NULL REFERENCES bewohner(id) ON DELETE CASCADE,

  woche_von             DATE NOT NULL,
  woche_bis             DATE NOT NULL,

  -- Zusammenfassung
  allgemeinzustand      TEXT, -- gut/mittel/schlecht/sehr_gut
  highlights            TEXT,  -- Positives der Woche
  besonderheiten        TEXT,  -- Was war besonders / auffällig?

  -- Daten aus Protokollen (JSONB-Snapshots)
  vitalwerte_summary    JSONB DEFAULT '{}',
  medikamente_summary   JSONB DEFAULT '{}',
  aktivitaeten_summary  JSONB DEFAULT '{}',
  schlaf_summary        JSONB DEFAULT '{}',
  mahlzeiten_summary    JSONB DEFAULT '{}',
  wohlbefinden_summary  JSONB DEFAULT '{}',

  -- Nächste Woche
  termine_naechste_woche TEXT[],
  hinweise_angehoerige  TEXT,

  -- Status
  status                TEXT NOT NULL DEFAULT 'entwurf', -- entwurf / freigegeben / versendet
  freigegeben_am        TIMESTAMPTZ,
  versendet_am          TIMESTAMPTZ,
  erstellt_von          UUID REFERENCES profiles(id),

  erstellt_am           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (bewohner_id, woche_von)
);

-- RLS
ALTER TABLE bewohner_wochenberichte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_own_wochenberichte" ON bewohner_wochenberichte
  FOR ALL USING (
    anbieter_id = (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.owner_id
      WHERE p.id = auth.uid()
    )
  );

-- Angehörige dürfen freigegebene Wochenberichte lesen (wenn Berechtigung vorhanden)
CREATE POLICY "angehoerige_read_wochenberichte" ON bewohner_wochenberichte
  FOR SELECT USING (
    status IN ('freigegeben', 'versendet') AND
    EXISTS (
      SELECT 1 FROM bewohner_angehoerige ba
      WHERE ba.bewohner_id = bewohner_wochenberichte.bewohner_id
        AND ba.profil_id = auth.uid()
        AND ba.aktiv = TRUE
    )
  );

CREATE POLICY "admin_read_wochenberichte" ON bewohner_wochenberichte
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- updated_at Trigger
CREATE OR REPLACE FUNCTION update_wochenberichte_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_wochenberichte_updated_at
  BEFORE UPDATE ON bewohner_wochenberichte
  FOR EACH ROW EXECUTE FUNCTION update_wochenberichte_updated_at();

CREATE INDEX IF NOT EXISTS idx_wochenberichte_bewohner ON bewohner_wochenberichte(bewohner_id);
CREATE INDEX IF NOT EXISTS idx_wochenberichte_anbieter ON bewohner_wochenberichte(anbieter_id);
CREATE INDEX IF NOT EXISTS idx_wochenberichte_woche ON bewohner_wochenberichte(woche_von DESC);

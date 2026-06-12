-- F63: Qualitätsindikatoren-Dashboard (QID)
-- Stores quality indicator measurements per Anbieter

CREATE TABLE IF NOT EXISTS qualitaetsindikatoren (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id UUID NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  -- Zeitraum
  periode TEXT NOT NULL CHECK (periode ~ '^\d{4}-(Q[1-4]|M(0[1-9]|1[0-2]))$'), -- e.g. 2024-Q1 or 2024-M06
  -- Kategorie & Name
  kategorie TEXT NOT NULL DEFAULT 'allgemein'
    CHECK (kategorie IN ('pflege','dokumentation','zufriedenheit','sicherheit','personal','allgemein')),
  indikator TEXT NOT NULL CHECK (char_length(indikator) BETWEEN 1 AND 200),
  -- Messwerte
  wert NUMERIC(10,2) NOT NULL,
  einheit TEXT NOT NULL DEFAULT '%' CHECK (char_length(einheit) <= 20),
  zielwert NUMERIC(10,2),
  -- Status
  bewertung TEXT NOT NULL DEFAULT 'neutral'
    CHECK (bewertung IN ('gut','akzeptabel','verbesserungsbedarf','kritisch','neutral')),
  trend TEXT NOT NULL DEFAULT 'stabil'
    CHECK (trend IN ('steigend','stabil','fallend')),
  -- Metadaten
  notiz TEXT CHECK (char_length(notiz) <= 1000),
  quelle TEXT CHECK (char_length(quelle) <= 200),
  erstellt_von UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(anbieter_id, periode, kategorie, indikator)
);

-- RLS
ALTER TABLE qualitaetsindikatoren ENABLE ROW LEVEL SECURITY;

-- Anbieter: full access to own data
CREATE POLICY "anbieter_qid_select" ON qualitaetsindikatoren
  FOR SELECT TO authenticated
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
      UNION
      SELECT tm.anbieter_id FROM team_mitglieder tm
      JOIN profiles p ON p.id = tm.profile_id
      WHERE p.user_id = auth.uid() AND tm.aktiv = true
    )
  );

CREATE POLICY "anbieter_qid_insert" ON qualitaetsindikatoren
  FOR INSERT TO authenticated
  WITH CHECK (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
      UNION
      SELECT tm.anbieter_id FROM team_mitglieder tm
      JOIN profiles p ON p.id = tm.profile_id
      WHERE p.user_id = auth.uid() AND tm.aktiv = true
    )
  );

CREATE POLICY "anbieter_qid_update" ON qualitaetsindikatoren
  FOR UPDATE TO authenticated
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "anbieter_qid_delete" ON qualitaetsindikatoren
  FOR DELETE TO authenticated
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_qid_anbieter_periode ON qualitaetsindikatoren(anbieter_id, periode DESC);
CREATE INDEX idx_qid_anbieter_kategorie ON qualitaetsindikatoren(anbieter_id, kategorie);
CREATE INDEX idx_qid_bewertung ON qualitaetsindikatoren(anbieter_id, bewertung) WHERE bewertung IN ('kritisch','verbesserungsbedarf');

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_qualitaetsindikatoren_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER qualitaetsindikatoren_updated_at
  BEFORE UPDATE ON qualitaetsindikatoren
  FOR EACH ROW EXECUTE FUNCTION update_qualitaetsindikatoren_updated_at();

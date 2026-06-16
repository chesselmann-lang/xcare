-- F72: MDK-Qualitätsbericht-Generator (§115 SGB XI)

CREATE TABLE IF NOT EXISTS qualitaetsberichte (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id     UUID NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  erstellt_von    UUID REFERENCES profiles(id),
  titel           TEXT NOT NULL,
  zeitraum_von    DATE NOT NULL,
  zeitraum_bis    DATE NOT NULL,
  -- Aggregierte Kennzahlen (snapshot zum Zeitpunkt der Erstellung)
  bewohner_anzahl  INT NOT NULL DEFAULT 0,
  team_groesse     INT NOT NULL DEFAULT 0,
  betreuungsquote  NUMERIC(5,2),
  -- MDK-Bereiche (JSON mit Scores 0-100)
  bereich_pflege        JSONB,  -- {score, items[]}
  bereich_sozial        JSONB,
  bereich_hotel         JSONB,
  bereich_organisation  JSONB,
  gesamtnote      NUMERIC(4,2),  -- 1.0–6.0 (Schulnoten-System MDK)
  empfehlungen    TEXT[],
  massnahmen      TEXT[],
  -- Export
  status          TEXT NOT NULL DEFAULT 'entwurf',  -- 'entwurf','fertig','eingereicht'
  exportiert_am   TIMESTAMPTZ,
  notizen         TEXT,
  erstellt_am     TIMESTAMPTZ NOT NULL DEFAULT now(),
  aktualisiert_am TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qualitaetsberichte_anbieter ON qualitaetsberichte(anbieter_id);
CREATE INDEX IF NOT EXISTS idx_qualitaetsberichte_zeitraum ON qualitaetsberichte(zeitraum_von, zeitraum_bis);

CREATE OR REPLACE FUNCTION update_qualitaetsberichte_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.aktualisiert_am = now(); RETURN NEW; END;
$$;

CREATE TRIGGER qualitaetsberichte_updated_at
  BEFORE UPDATE ON qualitaetsberichte
  FOR EACH ROW EXECUTE FUNCTION update_qualitaetsberichte_ts();

ALTER TABLE qualitaetsberichte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_own_qualitaetsberichte" ON qualitaetsberichte
  FOR ALL USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_read_qualitaetsberichte" ON qualitaetsberichte
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

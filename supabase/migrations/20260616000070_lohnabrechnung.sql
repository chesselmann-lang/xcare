-- F70: Lohnabrechnung & DATEV-Export

CREATE TYPE lohnperiode_status AS ENUM ('offen', 'geprueft', 'freigegeben', 'exportiert');

CREATE TABLE IF NOT EXISTS lohnperioden (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id      UUID NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  care_worker_id   UUID NOT NULL REFERENCES care_workers(id) ON DELETE CASCADE,
  periode_start    DATE NOT NULL,
  periode_ende     DATE NOT NULL,
  schichten_anzahl INT NOT NULL DEFAULT 0,
  stunden_geplant      NUMERIC(8,2) NOT NULL DEFAULT 0,
  stunden_tatsaechlich NUMERIC(8,2) NOT NULL DEFAULT 0,
  zuschlaege_ct    INT NOT NULL DEFAULT 0,
  brutto_ct        INT NOT NULL DEFAULT 0,
  status           lohnperiode_status NOT NULL DEFAULT 'offen',
  notizen          TEXT,
  freigegeben_von  UUID REFERENCES profiles(id),
  freigegeben_am   TIMESTAMPTZ,
  exportiert_am    TIMESTAMPTZ,
  export_datei     TEXT,
  erstellt_am      TIMESTAMPTZ NOT NULL DEFAULT now(),
  aktualisiert_am  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (anbieter_id, care_worker_id, periode_start)
);

CREATE TABLE IF NOT EXISTS lohnbestandteile (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lohnperiode_id UUID NOT NULL REFERENCES lohnperioden(id) ON DELETE CASCADE,
  schicht_id     UUID REFERENCES schichten(id) ON DELETE SET NULL,
  art            TEXT NOT NULL,
  stunden        NUMERIC(6,2) NOT NULL DEFAULT 0,
  stundensatz_ct INT NOT NULL DEFAULT 0,
  betrag_ct      INT NOT NULL DEFAULT 0,
  beschreibung   TEXT,
  erstellt_am    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lohnperioden_anbieter ON lohnperioden(anbieter_id);
CREATE INDEX IF NOT EXISTS idx_lohnperioden_cw ON lohnperioden(care_worker_id);
CREATE INDEX IF NOT EXISTS idx_lohnperioden_periode ON lohnperioden(periode_start);
CREATE INDEX IF NOT EXISTS idx_lohnperioden_status ON lohnperioden(status);
CREATE INDEX IF NOT EXISTS idx_lohnbestandteile_periode ON lohnbestandteile(lohnperiode_id);

CREATE OR REPLACE FUNCTION update_lohnperioden_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.aktualisiert_am = now(); RETURN NEW; END;
$$;

CREATE TRIGGER lohnperioden_updated_at
  BEFORE UPDATE ON lohnperioden
  FOR EACH ROW EXECUTE FUNCTION update_lohnperioden_ts();

ALTER TABLE lohnperioden ENABLE ROW LEVEL SECURITY;
ALTER TABLE lohnbestandteile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_own_lohnperioden" ON lohnperioden
  FOR ALL USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "anbieter_own_lohnbestandteile" ON lohnbestandteile
  FOR ALL USING (
    lohnperiode_id IN (
      SELECT lp.id FROM lohnperioden lp
      JOIN anbieter a ON a.id = lp.anbieter_id
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_read_lohnperioden" ON lohnperioden
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

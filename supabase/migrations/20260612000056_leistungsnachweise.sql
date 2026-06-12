-- Migration: F67 — Leistungsnachweis & Abrechnungs-Export (SGB XI)
-- Tracks billable care services per resident per period

CREATE TABLE leistungsnachweise (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id   UUID NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  bewohner_id   UUID REFERENCES bewohner(id) ON DELETE SET NULL,
  tour_einsatz_id UUID REFERENCES tour_einsaetze(id) ON DELETE SET NULL,

  -- Billing period + metadata
  leistungsdatum DATE NOT NULL,
  abrechnungsmonat CHAR(7) NOT NULL, -- 'YYYY-MM'

  -- Client info (denormalized for export stability)
  kunde_name      VARCHAR(200) NOT NULL,
  kunde_adresse   VARCHAR(500),
  krankenkasse    VARCHAR(200),
  versicherungsnummer VARCHAR(50),

  -- Service detail
  leistungsart    VARCHAR(200) NOT NULL,
  leistungsminuten INT CHECK (leistungsminuten BETWEEN 1 AND 480),
  einheit         VARCHAR(50) DEFAULT 'Minuten', -- 'Minuten', 'Einsatz', 'Stunden'
  einzelpreis_ct  INT CHECK (einzelpreis_ct >= 0), -- price in euro-cents
  menge           NUMERIC(8,2) DEFAULT 1,
  gesamtbetrag_ct INT GENERATED ALWAYS AS (
    CASE WHEN einzelpreis_ct IS NOT NULL
    THEN ROUND(einzelpreis_ct * menge)::INT
    ELSE NULL END
  ) STORED,

  -- Status
  status          VARCHAR(30) NOT NULL DEFAULT 'offen'
    CHECK (status IN ('offen', 'eingereicht', 'genehmigt', 'abgelehnt', 'storniert')),
  eingereicht_am  DATE,
  genehmigt_am    DATE,
  abrechnungs_referenz VARCHAR(100),

  -- Optional: IK-Nummern for GKV billing
  ik_anbieter     VARCHAR(20),
  ik_kasse        VARCHAR(20),

  notizen         VARCHAR(1000),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE leistungsnachweise ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_owner_leistungsnachweise" ON leistungsnachweise
  FOR ALL USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "team_member_leistungsnachweise_read" ON leistungsnachweise
  FOR SELECT USING (
    anbieter_id IN (
      SELECT tm.anbieter_id FROM team_members tm
      JOIN profiles p ON p.id = tm.profile_id
      WHERE p.user_id = auth.uid() AND tm.aktiv = TRUE
    )
  );

-- Indexes
CREATE INDEX idx_leistungsnachweise_anbieter ON leistungsnachweise (anbieter_id);
CREATE INDEX idx_leistungsnachweise_abrechnungsmonat ON leistungsnachweise (anbieter_id, abrechnungsmonat DESC);
CREATE INDEX idx_leistungsnachweise_bewohner ON leistungsnachweise (bewohner_id);
CREATE INDEX idx_leistungsnachweise_status ON leistungsnachweise (anbieter_id, status);
CREATE INDEX idx_leistungsnachweise_datum ON leistungsnachweise (anbieter_id, leistungsdatum DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_leistungsnachweise_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_leistungsnachweise_updated_at
  BEFORE UPDATE ON leistungsnachweise
  FOR EACH ROW EXECUTE FUNCTION update_leistungsnachweise_updated_at();

-- F64: Dienstplan-Optimierer (KI-gestützte Schichtplanung)

CREATE TABLE IF NOT EXISTS dienstplan_vorschlaege (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id UUID NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  woche_start DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'entwurf'
    CHECK (status IN ('entwurf','aktiv','archiviert')),
  -- KI-Metadaten
  optimierungsziel TEXT NOT NULL DEFAULT 'ausgewogen'
    CHECK (optimierungsziel IN ('ausgewogen','kostenminimal','qualitaetsmaximum','ruhezeiten')),
  ki_begruendung TEXT CHECK (char_length(ki_begruendung) <= 2000),
  -- Payload: JSON-Array der Schichtblöcke
  schichten JSONB NOT NULL DEFAULT '[]'::jsonb,
  erstellt_von UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(anbieter_id, woche_start)
);

-- Schicht-Einzeleinträge für Verlauf / Änderungen
CREATE TABLE IF NOT EXISTS dienstplan_eintraege (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vorschlag_id UUID NOT NULL REFERENCES dienstplan_vorschlaege(id) ON DELETE CASCADE,
  anbieter_id UUID NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  -- Mitarbeiter (team_member profile_id)
  mitarbeiter_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  datum DATE NOT NULL,
  schicht_beginn TIME NOT NULL,
  schicht_ende TIME NOT NULL,
  schichttyp TEXT NOT NULL DEFAULT 'frueh'
    CHECK (schichttyp IN ('frueh','spaet','nacht','bereitschaft','frei')),
  qualifikation_erforderlich TEXT CHECK (char_length(qualifikation_erforderlich) <= 100),
  notiz TEXT CHECK (char_length(notiz) <= 500),
  ki_vorschlag BOOLEAN NOT NULL DEFAULT false,
  bestaetigt BOOLEAN NOT NULL DEFAULT false,
  bestaetigt_am TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE dienstplan_vorschlaege ENABLE ROW LEVEL SECURITY;
ALTER TABLE dienstplan_eintraege ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_dienstplan_vorschlaege" ON dienstplan_vorschlaege
  FOR ALL USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
      UNION
      SELECT tm.anbieter_id FROM team_members tm
      JOIN profiles p ON p.id = tm.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "anbieter_dienstplan_eintraege" ON dienstplan_eintraege
  FOR ALL USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
      UNION
      SELECT tm.anbieter_id FROM team_members tm
      JOIN profiles p ON p.id = tm.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dienstplan_vorschlaege_anbieter_woche
  ON dienstplan_vorschlaege(anbieter_id, woche_start DESC);
CREATE INDEX IF NOT EXISTS idx_dienstplan_eintraege_vorschlag
  ON dienstplan_eintraege(vorschlag_id);
CREATE INDEX IF NOT EXISTS idx_dienstplan_eintraege_mitarbeiter_datum
  ON dienstplan_eintraege(mitarbeiter_profile_id, datum);

-- updated_at trigger
CREATE OR REPLACE TRIGGER dienstplan_vorschlaege_updated_at
  BEFORE UPDATE ON dienstplan_vorschlaege
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

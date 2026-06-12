-- F60: Digitale Pinnwand — Care-Team Schwarzes Brett
-- Bulletin board for care teams and families

CREATE TABLE IF NOT EXISTS pinnwand_eintraege (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id          UUID REFERENCES anbieter(id) ON DELETE CASCADE,
  familie_profile_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  autor_profile_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  titel                TEXT NOT NULL CHECK (char_length(titel) BETWEEN 1 AND 200),
  inhalt               TEXT NOT NULL CHECK (char_length(inhalt) BETWEEN 1 AND 5000),
  kategorie            TEXT NOT NULL DEFAULT 'info'
                         CHECK (kategorie IN ('info','aufgabe','erinnerung','warnung','lob')),
  prioritaet           TEXT NOT NULL DEFAULT 'normal'
                         CHECK (prioritaet IN ('normal','hoch','dringend')),
  ist_angepinnt        BOOLEAN NOT NULL DEFAULT false,
  farbe                TEXT CHECK (farbe IN ('grau','blau','gruen','gelb','rot','lila') OR farbe IS NULL),
  faellig_am           DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pinnwand_gelesen (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eintrag_id  UUID NOT NULL REFERENCES pinnwand_eintraege(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gelesen_am  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (eintrag_id, profile_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_pinnwand_anbieter ON pinnwand_eintraege(anbieter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pinnwand_familie ON pinnwand_eintraege(familie_profile_id);
CREATE INDEX IF NOT EXISTS idx_pinnwand_pinned ON pinnwand_eintraege(anbieter_id, ist_angepinnt) WHERE ist_angepinnt = true;
CREATE INDEX IF NOT EXISTS idx_pinnwand_gelesen_eintrag ON pinnwand_gelesen(eintrag_id);
CREATE INDEX IF NOT EXISTS idx_pinnwand_gelesen_profile ON pinnwand_gelesen(profile_id);

-- updated_at trigger
CREATE OR REPLACE TRIGGER pinnwand_eintraege_updated_at
  BEFORE UPDATE ON pinnwand_eintraege
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE pinnwand_eintraege ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinnwand_gelesen   ENABLE ROW LEVEL SECURITY;

-- Anbieter can read their own entries (team-wide or client-specific)
CREATE POLICY "anbieter_read_pinnwand" ON pinnwand_eintraege
  FOR SELECT USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON a.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
    OR
    -- Care workers of that anbieter (via team table if exists, else by anbieter scope)
    anbieter_id IN (
      SELECT at2.anbieter_id FROM anbieter_team at2
      JOIN profiles p ON at2.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "anbieter_write_pinnwand" ON pinnwand_eintraege
  FOR INSERT WITH CHECK (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON a.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
    OR
    anbieter_id IN (
      SELECT at2.anbieter_id FROM anbieter_team at2
      JOIN profiles p ON at2.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "anbieter_update_pinnwand" ON pinnwand_eintraege
  FOR UPDATE USING (
    autor_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON a.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "anbieter_delete_pinnwand" ON pinnwand_eintraege
  FOR DELETE USING (
    autor_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON a.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Familie can read entries for their profile
CREATE POLICY "familie_read_pinnwand" ON pinnwand_eintraege
  FOR SELECT USING (
    familie_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Gelesen policies
CREATE POLICY "read_own_gelesen" ON pinnwand_gelesen
  FOR SELECT USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_own_gelesen" ON pinnwand_gelesen
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "delete_own_gelesen" ON pinnwand_gelesen
  FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

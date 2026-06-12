-- F61: Arbeitszeiterfassung — Digitaler Stundenachweis

CREATE TABLE IF NOT EXISTS arbeitszeit (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id       UUID NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  care_worker_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  familie_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  datum             DATE NOT NULL,
  beginn            TIME NOT NULL,
  ende              TIME,
  pause_min         INTEGER NOT NULL DEFAULT 0 CHECK (pause_min >= 0),
  taetigkeit        TEXT NOT NULL CHECK (char_length(taetigkeit) BETWEEN 1 AND 500),
  kategorie         TEXT NOT NULL DEFAULT 'pflege'
                      CHECK (kategorie IN ('pflege','hauswirtschaft','begleitung','verwaltung','sonstiges')),
  status            TEXT NOT NULL DEFAULT 'offen'
                      CHECK (status IN ('offen','bestaetigt','abgerechnet')),
  notiz             TEXT CHECK (char_length(notiz) <= 1000),
  erstellt_von      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_arbeitszeit_anbieter_datum ON arbeitszeit(anbieter_id, datum DESC);
CREATE INDEX IF NOT EXISTS idx_arbeitszeit_worker ON arbeitszeit(care_worker_id, datum DESC);
CREATE INDEX IF NOT EXISTS idx_arbeitszeit_familie ON arbeitszeit(familie_profile_id, datum DESC);
CREATE INDEX IF NOT EXISTS idx_arbeitszeit_status ON arbeitszeit(anbieter_id, status) WHERE status = 'offen';

-- updated_at trigger
CREATE OR REPLACE TRIGGER arbeitszeit_updated_at
  BEFORE UPDATE ON arbeitszeit
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE arbeitszeit ENABLE ROW LEVEL SECURITY;

-- Anbieter owner: full access
CREATE POLICY "anbieter_all_arbeitszeit" ON arbeitszeit
  FOR ALL USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON a.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Team members: read + insert their own
CREATE POLICY "team_read_arbeitszeit" ON arbeitszeit
  FOR SELECT USING (
    anbieter_id IN (
      SELECT at2.anbieter_id FROM anbieter_team at2
      JOIN profiles p ON at2.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "team_insert_arbeitszeit" ON arbeitszeit
  FOR INSERT WITH CHECK (
    anbieter_id IN (
      SELECT at2.anbieter_id FROM anbieter_team at2
      JOIN profiles p ON at2.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
    AND erstellt_von IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Familie: read their own entries
CREATE POLICY "familie_read_arbeitszeit" ON arbeitszeit
  FOR SELECT USING (
    familie_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

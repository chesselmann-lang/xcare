-- F62: Pflegeplanung 2.0 — Pflegeziele, Maßnahmen & Evaluation

CREATE TABLE IF NOT EXISTS pflegeziele (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id        UUID NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  familie_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  titel              TEXT NOT NULL CHECK (char_length(titel) BETWEEN 1 AND 200),
  beschreibung       TEXT CHECK (char_length(beschreibung) <= 2000),
  bereich            TEXT NOT NULL DEFAULT 'allgemein'
                       CHECK (bereich IN ('koerperpflege','ernaehrung','mobilitaet','kognition','soziales','schmerz','wunden','medikamente','allgemein')),
  prioritaet         TEXT NOT NULL DEFAULT 'mittel'
                       CHECK (prioritaet IN ('niedrig','mittel','hoch','dringend')),
  status             TEXT NOT NULL DEFAULT 'aktiv'
                       CHECK (status IN ('aktiv','erreicht','pausiert','abgebrochen')),
  zieldatum          DATE,
  erreicht_am        DATE,
  erstellt_von       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pflegeziel_massnahmen (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ziel_id      UUID NOT NULL REFERENCES pflegeziele(id) ON DELETE CASCADE,
  beschreibung TEXT NOT NULL CHECK (char_length(beschreibung) BETWEEN 1 AND 1000),
  haeufigkeit  TEXT CHECK (char_length(haeufigkeit) <= 100),
  verantwortlich TEXT CHECK (char_length(verantwortlich) <= 200),
  erledigt     BOOLEAN NOT NULL DEFAULT false,
  erledigt_am  TIMESTAMPTZ,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pflegeziel_evaluationen (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ziel_id      UUID NOT NULL REFERENCES pflegeziele(id) ON DELETE CASCADE,
  datum        DATE NOT NULL DEFAULT CURRENT_DATE,
  ergebnis     TEXT NOT NULL CHECK (ergebnis IN ('verbessert','unveraendert','verschlechtert','erreicht')),
  notiz        TEXT CHECK (char_length(notiz) <= 2000),
  erstellt_von UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pflegeziele_anbieter    ON pflegeziele(anbieter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pflegeziele_familie     ON pflegeziele(familie_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_pflegeziele_status      ON pflegeziele(anbieter_id, status) WHERE status = 'aktiv';
CREATE INDEX IF NOT EXISTS idx_massnahmen_ziel         ON pflegeziel_massnahmen(ziel_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_evaluationen_ziel       ON pflegeziel_evaluationen(ziel_id, datum DESC);

-- updated_at trigger
CREATE OR REPLACE TRIGGER pflegeziele_updated_at
  BEFORE UPDATE ON pflegeziele
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE pflegeziele                ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflegeziel_massnahmen      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pflegeziel_evaluationen    ENABLE ROW LEVEL SECURITY;

-- Anbieter: full access to their pflegeziele
CREATE POLICY "anbieter_all_pflegeziele" ON pflegeziele
  FOR ALL USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON a.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
    OR anbieter_id IN (
      SELECT at2.anbieter_id FROM anbieter_team at2
      JOIN profiles p ON at2.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Familie: read own
CREATE POLICY "familie_read_pflegeziele" ON pflegeziele
  FOR SELECT USING (
    familie_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Massnahmen: via ziel ownership
CREATE POLICY "anbieter_massnahmen" ON pflegeziel_massnahmen
  FOR ALL USING (
    ziel_id IN (
      SELECT z.id FROM pflegeziele z
      JOIN anbieter a ON z.anbieter_id = a.id
      JOIN profiles p ON a.profile_id = p.id
      WHERE p.user_id = auth.uid()
      UNION
      SELECT z.id FROM pflegeziele z
      JOIN anbieter_team at2 ON z.anbieter_id = at2.anbieter_id
      JOIN profiles p ON at2.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "familie_read_massnahmen" ON pflegeziel_massnahmen
  FOR SELECT USING (
    ziel_id IN (
      SELECT z.id FROM pflegeziele z
      WHERE z.familie_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Evaluationen: via ziel ownership
CREATE POLICY "anbieter_evaluationen" ON pflegeziel_evaluationen
  FOR ALL USING (
    ziel_id IN (
      SELECT z.id FROM pflegeziele z
      JOIN anbieter a ON z.anbieter_id = a.id
      JOIN profiles p ON a.profile_id = p.id
      WHERE p.user_id = auth.uid()
      UNION
      SELECT z.id FROM pflegeziele z
      JOIN anbieter_team at2 ON z.anbieter_id = at2.anbieter_id
      JOIN profiles p ON at2.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "familie_read_evaluationen" ON pflegeziel_evaluationen
  FOR SELECT USING (
    ziel_id IN (
      SELECT z.id FROM pflegeziele z
      WHERE z.familie_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

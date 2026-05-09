-- Zuletzt angesehene Anbieter (pro Familie)
CREATE TABLE IF NOT EXISTS anbieter_zuletzt_angesehen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familie_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  anbieter_id uuid NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  gesehen_am timestamptz NOT NULL DEFAULT now(),
  UNIQUE (familie_id, anbieter_id)
);

ALTER TABLE anbieter_zuletzt_angesehen ENABLE ROW LEVEL SECURITY;

-- Familie sieht nur ihre eigenen Einträge
CREATE POLICY "zuletzt_angesehen_own" ON anbieter_zuletzt_angesehen
  FOR ALL USING (
    familie_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE INDEX IF NOT EXISTS idx_zuletzt_angesehen_familie_gesehen
  ON anbieter_zuletzt_angesehen (familie_id, gesehen_am DESC);

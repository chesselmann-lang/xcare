-- Merkliste: Familie saves Anbieter they plan to contact
CREATE TABLE IF NOT EXISTS merkliste (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familie_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  anbieter_id uuid NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  notiz      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(familie_id, anbieter_id)
);

ALTER TABLE merkliste ENABLE ROW LEVEL SECURITY;

-- Familie can manage their own merkliste
CREATE POLICY "merkliste_own" ON merkliste
  FOR ALL USING (
    familie_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

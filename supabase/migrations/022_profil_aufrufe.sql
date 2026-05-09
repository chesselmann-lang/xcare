-- Anbieter profile view tracking (privacy-friendly, no user-identifying data)
CREATE TABLE IF NOT EXISTS anbieter_profil_aufrufe (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id uuid NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  referrer    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE anbieter_profil_aufrufe ENABLE ROW LEVEL SECURITY;

-- Anbieter can read their own view stats
CREATE POLICY "aufrufe_anbieter_read" ON anbieter_profil_aufrufe
  FOR SELECT USING (
    anbieter_id IN (
      SELECT id FROM anbieter
      WHERE profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Anyone (including anonymous visitors) can insert a view event
CREATE POLICY "aufrufe_insert_public" ON anbieter_profil_aufrufe
  FOR INSERT WITH CHECK (true);

-- Index for efficient per-anbieter queries sorted by date
CREATE INDEX IF NOT EXISTS idx_profil_aufrufe_anbieter_created
  ON anbieter_profil_aufrufe (anbieter_id, created_at DESC);

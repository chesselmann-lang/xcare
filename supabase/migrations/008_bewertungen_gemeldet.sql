-- Sprint 101: Admin Content-Moderation für Bewertungen
-- Adds `gemeldet` (flagged/reported) boolean to bewertungen table
-- Admins can flag suspicious reviews for review and delete them

ALTER TABLE bewertungen
  ADD COLUMN IF NOT EXISTS gemeldet boolean NOT NULL DEFAULT false;

-- Index for efficient admin filter queries
CREATE INDEX IF NOT EXISTS idx_bewertungen_gemeldet
  ON bewertungen (gemeldet)
  WHERE gemeldet = true;

-- Allow families to report a review (set gemeldet = true) on reviews for anbieter they interacted with
-- Admins can set gemeldet to any value and delete rows
-- The existing RLS policies on bewertungen cover selects; we add update permission for families

-- Families can flag reviews (set gemeldet = true) — only for bewertungen they themselves submitted
CREATE POLICY "Familie kann eigene Bewertung melden"
  ON bewertungen
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.id = bewertungen.familie_id
        AND profiles.role = 'familie'
    )
  )
  WITH CHECK (true);

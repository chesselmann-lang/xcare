-- Sprint 104: Anbieter-Antwort auf Bewertungen
-- Adds antwort (provider reply) and antwort_at columns to bewertungen table

ALTER TABLE bewertungen
  ADD COLUMN IF NOT EXISTS antwort text,
  ADD COLUMN IF NOT EXISTS antwort_at timestamptz;

-- Index for filtering reviews with replies
CREATE INDEX IF NOT EXISTS idx_bewertungen_antwort
  ON bewertungen (anbieter_id)
  WHERE antwort IS NOT NULL;

-- Anbieter can update antwort on reviews they received
CREATE POLICY "Anbieter kann auf eigene Bewertungen antworten"
  ON bewertungen
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM anbieter
      WHERE anbieter.id = bewertungen.anbieter_id
        AND anbieter.user_id = auth.uid()
    )
  )
  WITH CHECK (true);

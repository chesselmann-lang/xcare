-- Sprint 231: anfragen_statusverlauf
-- Admin-seitige Statusänderungs-Historie (getrennt von anfragen_historie die von der App geschrieben wird)
CREATE TABLE IF NOT EXISTS anfragen_statusverlauf (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anfrage_id      uuid NOT NULL REFERENCES anfragen(id) ON DELETE CASCADE,
  alter_status    text,
  neuer_status    text NOT NULL,
  geaendert_von   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  kommentar       text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anfragen_statusverlauf_anfrage
  ON anfragen_statusverlauf (anfrage_id, created_at DESC);

ALTER TABLE anfragen_statusverlauf ENABLE ROW LEVEL SECURITY;

-- Admins can read and write
CREATE POLICY "admin_manage_statusverlauf" ON anfragen_statusverlauf
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Familie can read their own anfragen statusverlauf
CREATE POLICY "familie_read_statusverlauf" ON anfragen_statusverlauf
  FOR SELECT USING (
    anfrage_id IN (
      SELECT id FROM anfragen WHERE familie_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

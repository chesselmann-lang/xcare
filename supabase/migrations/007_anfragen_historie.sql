-- Migration 007: Anfragen-Status-Historie

-- Track every status change for an Anfrage as an immutable audit log
CREATE TABLE IF NOT EXISTS anfragen_historie (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anfrage_id  UUID NOT NULL REFERENCES anfragen(id) ON DELETE CASCADE,
  alter_status TEXT,                        -- NULL for first entry (creation)
  neuer_status TEXT NOT NULL,
  notiz        TEXT,                        -- optional context note
  geaendert_von UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup per anfrage, ordered by time
CREATE INDEX IF NOT EXISTS idx_anfragen_historie_anfrage_id
  ON anfragen_historie (anfrage_id, created_at);

-- RLS: Both familie and anbieter can view history for their anfragen
ALTER TABLE anfragen_historie ENABLE ROW LEVEL SECURITY;

-- Familie can view history of their own anfragen
CREATE POLICY "familie_view_own_anfragen_historie"
  ON anfragen_historie FOR SELECT
  USING (
    anfrage_id IN (
      SELECT id FROM anfragen WHERE familie_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Anbieter can view history of anfragen directed at them
CREATE POLICY "anbieter_view_own_anfragen_historie"
  ON anfragen_historie FOR SELECT
  USING (
    anfrage_id IN (
      SELECT id FROM anfragen WHERE anbieter_id IN (
        SELECT id FROM anbieter WHERE profile_id IN (
          SELECT id FROM profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Only service role (via API routes) can insert/update/delete
-- (history is written by the API, not directly by users)
CREATE POLICY "service_role_manage_anfragen_historie"
  ON anfragen_historie FOR ALL
  USING (auth.role() = 'service_role');

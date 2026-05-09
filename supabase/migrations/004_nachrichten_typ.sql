-- Migration 004: Add typ column to nachrichten for special message types

ALTER TABLE nachrichten
  ADD COLUMN IF NOT EXISTS typ TEXT NOT NULL DEFAULT 'text'
    CHECK (typ IN ('text', 'termin_vorschlag', 'system'));

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_nachrichten_typ ON nachrichten (typ)
  WHERE typ != 'text';

-- For termin_vorschlag messages, status is embedded in the JSON inhalt.
-- This function updates the status of a termin_vorschlag message:
-- UPDATE nachrichten SET inhalt = inhalt::jsonb || '{"status":"angenommen"}'
-- WHERE id = $1 AND typ = 'termin_vorschlag';

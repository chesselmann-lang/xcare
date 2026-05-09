-- Migration 006: Öffnungszeiten für Anbieter

-- Add oeffnungszeiten JSONB column to anbieter table
-- Structure: { "mo": { "offen": boolean, "von": "HH:MM", "bis": "HH:MM" }, ... }
ALTER TABLE anbieter
  ADD COLUMN IF NOT EXISTS oeffnungszeiten JSONB;

-- Add social_media JSONB column for optional social links
ALTER TABLE anbieter
  ADD COLUMN IF NOT EXISTS social_media JSONB;
-- Structure: { "facebook": "...", "instagram": "...", "linkedin": "..." }

-- Index for efficient filtering/querying
CREATE INDEX IF NOT EXISTS idx_anbieter_oeffnungszeiten
  ON anbieter USING GIN (oeffnungszeiten);

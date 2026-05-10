-- Sprint 234: DB performance indexes
-- Applied: 2026-05-10
-- Purpose: Fix missing indexes causing sequential scans in production

-- Critical: used by every Inngest opt-out check (profiles looked up by email)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Critical: used on every authenticated anbieter page load
CREATE INDEX IF NOT EXISTS idx_anbieter_profile_id ON anbieter(profile_id);

-- Full-text search GIN index (prevents seq scans on search_vector lookups)
CREATE INDEX IF NOT EXISTS idx_anbieter_search_vector ON anbieter USING GIN(search_vector);

-- Composite indexes for common query patterns on anfragen
CREATE INDEX IF NOT EXISTS idx_anfragen_anbieter_status ON anfragen(anbieter_id, status);
CREATE INDEX IF NOT EXISTS idx_anfragen_familie_status ON anfragen(familie_id, status);

-- Partial index for unread notification counts
-- WHERE gelesen = false filters the scan to only unread rows
CREATE INDEX IF NOT EXISTS idx_benachrichtigungen_profile_gelesen
  ON benachrichtigungen(profile_id, gelesen)
  WHERE gelesen = false;

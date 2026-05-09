-- Migration 005: CRM Tags für Anfragen (Anbieter-interne Markierungen)

-- Add crm_tags column to anfragen (text array, only visible to anbieter)
ALTER TABLE anfragen
  ADD COLUMN IF NOT EXISTS crm_tags TEXT[] NOT NULL DEFAULT '{}';

-- GIN index for array queries (e.g. WHERE 'VIP' = ANY(crm_tags))
CREATE INDEX IF NOT EXISTS idx_anfragen_crm_tags
  ON anfragen USING GIN (crm_tags);

-- Note: Existing RLS policy on anfragen should already restrict writes to the
-- anbieter who owns the anfrage, so no new policy needed for this column.
-- Verify the policy covers UPDATE on the anfragen table for anbieter role.

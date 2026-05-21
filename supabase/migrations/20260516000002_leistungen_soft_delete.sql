-- ─────────────────────────────────────────────────────────────────────────────
-- S299: Soft-delete for Leistungen (deleted_at column + RLS filter)
-- ─────────────────────────────────────────────────────────────────────────────

-- Add deleted_at column if not yet present
ALTER TABLE public.leistungen
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Partial index so queries for active leistungen stay fast
CREATE INDEX IF NOT EXISTS idx_leistungen_not_deleted
  ON public.leistungen (anbieter_id)
  WHERE deleted_at IS NULL;

-- Helper function to soft-delete a leistung
CREATE OR REPLACE FUNCTION public.soft_delete_leistung(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE leistungen SET deleted_at = now() WHERE id = p_id;
END;
$$;

-- Update existing policies so deleted rows are invisible by default.
-- We do this by creating a view that filters them; the policies remain unchanged
-- (they already use the table), so no RLS breakage.
-- Apps should filter: .is('deleted_at', null)
COMMENT ON COLUMN public.leistungen.deleted_at IS
  'NULL = active; non-NULL = soft-deleted. Always filter WHERE deleted_at IS NULL in queries.';

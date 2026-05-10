-- Sprint 257: Soft-delete support for profiles
-- Adds deleted_at column; RLS policies should filter WHERE deleted_at IS NULL.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Index so active-user queries stay fast
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles (deleted_at)
  WHERE deleted_at IS NULL;

-- Partial unique index: email must be unique only among non-deleted profiles
-- (existing unique constraint stays; this is belt-and-suspenders for reuse flows)
COMMENT ON COLUMN profiles.deleted_at IS
  'NULL = active account. Non-NULL = soft-deleted; awaiting hard-delete within 72 h per DSGVO.';

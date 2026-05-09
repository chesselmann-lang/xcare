-- Migration 003: Anbieter-Dokumente (Zertifikate, Nachweise)

CREATE TABLE IF NOT EXISTS anbieter_dokumente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id UUID NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  typ TEXT NOT NULL DEFAULT 'application/octet-stream',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(anbieter_id, path)
);

-- RLS
ALTER TABLE anbieter_dokumente ENABLE ROW LEVEL SECURITY;

-- Anbieter can manage own documents
DROP POLICY IF EXISTS "dokumente_manage_own" ON anbieter_dokumente;
CREATE POLICY "dokumente_manage_own" ON anbieter_dokumente
  FOR ALL USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
        JOIN profiles p ON p.id = a.profile_id
        WHERE p.user_id = auth.uid()
    )
  );

-- Admins can read all
DROP POLICY IF EXISTS "dokumente_admin_read" ON anbieter_dokumente;
CREATE POLICY "dokumente_admin_read" ON anbieter_dokumente
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Storage bucket (run in Supabase Dashboard if not using supabase CLI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('dokumente', 'dokumente', false)
-- ON CONFLICT DO NOTHING;

-- Storage RLS: Anbieter can upload/read/delete own files
-- CREATE POLICY "dokumente_upload" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'dokumente'
--     AND (storage.foldername(name))[1] IN (
--       SELECT a.id::text FROM anbieter a
--         JOIN profiles p ON p.id = a.profile_id
--         WHERE p.user_id = auth.uid()
--     )
--   );

-- CREATE POLICY "dokumente_read_own" ON storage.objects
--   FOR SELECT USING (
--     bucket_id = 'dokumente'
--     AND (storage.foldername(name))[1] IN (
--       SELECT a.id::text FROM anbieter a
--         JOIN profiles p ON p.id = a.profile_id
--         WHERE p.user_id = auth.uid()
--     )
--   );

-- CREATE POLICY "dokumente_delete_own" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'dokumente'
--     AND (storage.foldername(name))[1] IN (
--       SELECT a.id::text FROM anbieter a
--         JOIN profiles p ON p.id = a.profile_id
--         WHERE p.user_id = auth.uid()
--     )
--   );

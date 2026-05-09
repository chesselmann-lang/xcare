-- Sprint 182: Familie – Anfragen-Detailseite Dokumenten-Upload
-- Families can attach documents to their anfragen (e.g. care reports, prescriptions)

CREATE TABLE IF NOT EXISTS anfrage_dokumente (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anfrage_id   uuid NOT NULL REFERENCES anfragen(id) ON DELETE CASCADE,
  familie_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dateiname    text NOT NULL,
  storage_pfad text NOT NULL,
  mime_typ     text NOT NULL DEFAULT 'application/octet-stream',
  groesse_bytes bigint NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE anfrage_dokumente ENABLE ROW LEVEL SECURITY;

-- Familie can manage their own documents
DROP POLICY IF EXISTS "anfrage_dokumente_familie_own" ON anfrage_dokumente;
CREATE POLICY "anfrage_dokumente_familie_own" ON anfrage_dokumente
  FOR ALL USING (familie_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1));

-- Anbieter can read documents for their anfragen
DROP POLICY IF EXISTS "anfrage_dokumente_anbieter_read" ON anfrage_dokumente;
CREATE POLICY "anfrage_dokumente_anbieter_read" ON anfrage_dokumente
  FOR SELECT USING (
    anfrage_id IN (
      SELECT a.id FROM anfragen a
      JOIN anbieter ab ON ab.id = a.anbieter_id
      WHERE ab.profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    )
  );

-- Storage bucket for anfrage documents (run once via Supabase dashboard or this idempotent approach)
-- Note: bucket creation must be done via Supabase dashboard or Storage API, not SQL.
-- Bucket name: anfrage-dokumente (public: false, file size limit: 10 MB)

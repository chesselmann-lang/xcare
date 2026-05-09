-- Sprint 186: Anbieter – Profilgalerie (Foto-Upload)
-- Anbieter können bis zu 8 Fotos für ihr öffentliches Profil hochladen

CREATE TABLE IF NOT EXISTS anbieter_galerie (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id  uuid NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  storage_pfad text NOT NULL,
  alt_text     text,
  position     smallint NOT NULL DEFAULT 0,  -- sort order
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anbieter_galerie_anbieter ON anbieter_galerie(anbieter_id, position);

ALTER TABLE anbieter_galerie ENABLE ROW LEVEL SECURITY;

-- Anbieter verwalten eigene Galerie-Bilder
DROP POLICY IF EXISTS "galerie_anbieter_own" ON anbieter_galerie;
CREATE POLICY "galerie_anbieter_own" ON anbieter_galerie
  FOR ALL USING (
    anbieter_id IN (
      SELECT id FROM anbieter
      WHERE profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    )
  );

-- Öffentliche Lesbarkeit (für nicht eingeloggte Besucher)
DROP POLICY IF EXISTS "galerie_public_read" ON anbieter_galerie;
CREATE POLICY "galerie_public_read" ON anbieter_galerie
  FOR SELECT USING (true);

-- Storage bucket: anbieter-galerie (public: false, file size: 5 MB)
-- Must be created via Supabase dashboard or Storage API
-- Bucket name: anbieter-galerie

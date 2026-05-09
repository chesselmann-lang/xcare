-- Sprint 110: Gespeicherte Suchanfragen für Familien
CREATE TABLE IF NOT EXISTS public.gespeicherte_suchen (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,           -- user-defined label
  plz         text,
  radius_km   int DEFAULT 25,
  lebenslage  text,
  suchtext    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gespeicherte_suchen_profile
  ON gespeicherte_suchen (profile_id, created_at DESC);

ALTER TABLE gespeicherte_suchen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Eigene gespeicherte Suchen" ON gespeicherte_suchen
  FOR ALL TO authenticated
  USING (profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

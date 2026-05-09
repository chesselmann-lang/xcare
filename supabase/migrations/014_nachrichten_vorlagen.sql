-- Sprint 112: Anbieter Nachrichten-Vorlagen (Quick-Reply Templates)
CREATE TABLE IF NOT EXISTS public.nachrichten_vorlagen (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id uuid NOT NULL REFERENCES public.anbieter(id) ON DELETE CASCADE,
  titel       text NOT NULL,
  inhalt      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nachrichten_vorlagen_anbieter
  ON nachrichten_vorlagen (anbieter_id, created_at DESC);

ALTER TABLE nachrichten_vorlagen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Eigene Nachrichten-Vorlagen" ON nachrichten_vorlagen
  FOR ALL TO authenticated
  USING (anbieter_id IN (
    SELECT a.id FROM anbieter a
    JOIN profiles p ON a.profile_id = p.id
    WHERE p.user_id = auth.uid()
  ))
  WITH CHECK (anbieter_id IN (
    SELECT a.id FROM anbieter a
    JOIN profiles p ON a.profile_id = p.id
    WHERE p.user_id = auth.uid()
  ));

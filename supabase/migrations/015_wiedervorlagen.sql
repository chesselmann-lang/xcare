-- Sprint 119: Wiedervorlagen (Follow-up reminders) für Anbieter an Anfragen
CREATE TABLE IF NOT EXISTS public.wiedervorlagen (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anfrage_id   uuid NOT NULL REFERENCES public.anfragen(id) ON DELETE CASCADE,
  anbieter_id  uuid NOT NULL REFERENCES public.anbieter(id) ON DELETE CASCADE,
  faellig_am   date NOT NULL,
  notiz        text,
  erledigt     boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wiedervorlagen_anbieter
  ON wiedervorlagen (anbieter_id, faellig_am);

CREATE INDEX IF NOT EXISTS idx_wiedervorlagen_faellig
  ON wiedervorlagen (faellig_am, erledigt)
  WHERE erledigt = false;

ALTER TABLE wiedervorlagen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Eigene Wiedervorlagen" ON wiedervorlagen
  FOR ALL TO authenticated
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON a.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON a.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

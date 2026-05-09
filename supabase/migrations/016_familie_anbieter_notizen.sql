-- Sprint 120: Private Anbieter-Notizen für Familien
CREATE TABLE IF NOT EXISTS public.familie_anbieter_notizen (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familie_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  anbieter_id  uuid NOT NULL REFERENCES public.anbieter(id) ON DELETE CASCADE,
  notiz        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (familie_id, anbieter_id)
);

CREATE INDEX IF NOT EXISTS idx_familie_anbieter_notizen_familie
  ON familie_anbieter_notizen (familie_id);

ALTER TABLE familie_anbieter_notizen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Eigene Familie-Anbieter-Notizen" ON familie_anbieter_notizen
  FOR ALL TO authenticated
  USING (
    familie_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    familie_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

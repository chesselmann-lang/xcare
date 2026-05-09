-- Sprint 144: Abwesenheitsmodus für Anbieter
ALTER TABLE public.anbieter
  ADD COLUMN IF NOT EXISTS abwesend boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS abwesend_bis date,
  ADD COLUMN IF NOT EXISTS abwesend_notiz text;

-- ─────────────────────────────────────────────────────────────────────────────
-- S298: updated_at triggers for tables that are missing them
-- ─────────────────────────────────────────────────────────────────────────────

-- Generic trigger function (idempotent — only create if not exists)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Helper: create trigger only if the table has an updated_at column and no trigger yet
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'care_workers',
    'haushalt_mitglieder',
    'vollmachten',
    'medikamente',
    'schichten',
    'vitalwerte',
    'pflegedokumentation',
    'notfall_kontakte',
    'gespeicherte_suchen',
    'anbieter_notizvlagen',
    'ki_audit_log'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Only act if table + column exist and trigger doesn't already exist
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name  = t
        AND column_name = 'updated_at'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_' || t || '_updated_at'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_at
         BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
        t, t
      );
    END IF;
  END LOOP;
END;
$$;

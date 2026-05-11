-- ============================================================
-- Phase 4A: Finanz-Hub
-- pflegekassen_budgets, budget_transaktionen, haushaltsscheck_daten
-- ============================================================

-- ----------------------------------------------------------------
-- 1. pflegekassen_budgets
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pflegekassen_budgets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leistungsart  text NOT NULL,
  jahresbudget  numeric(10,2) NOT NULL,
  verbraucht    numeric(10,2) NOT NULL DEFAULT 0,
  jahr          integer NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pflegekassen_budgets_profil_id
  ON public.pflegekassen_budgets (profil_id);

CREATE INDEX IF NOT EXISTS idx_pflegekassen_budgets_profil_jahr
  ON public.pflegekassen_budgets (profil_id, jahr);

ALTER TABLE public.pflegekassen_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budgets_select_own" ON public.pflegekassen_budgets
  FOR SELECT USING (profil_id = auth.uid());

CREATE POLICY "budgets_insert_own" ON public.pflegekassen_budgets
  FOR INSERT WITH CHECK (profil_id = auth.uid());

CREATE POLICY "budgets_update_own" ON public.pflegekassen_budgets
  FOR UPDATE USING (profil_id = auth.uid());

CREATE POLICY "budgets_delete_own" ON public.pflegekassen_budgets
  FOR DELETE USING (profil_id = auth.uid());

-- updated_at trigger (idempotent function)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pflegekassen_budgets_updated_at'
  ) THEN
    CREATE TRIGGER trg_pflegekassen_budgets_updated_at
      BEFORE UPDATE ON public.pflegekassen_budgets
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 2. budget_transaktionen
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budget_transaktionen (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id     uuid NOT NULL REFERENCES public.pflegekassen_budgets(id) ON DELETE CASCADE,
  betrag        numeric(10,2) NOT NULL,
  beschreibung  text,
  datum         date NOT NULL DEFAULT CURRENT_DATE,
  beleg_url     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_transaktionen_budget_id
  ON public.budget_transaktionen (budget_id);

ALTER TABLE public.budget_transaktionen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transaktionen_select_own" ON public.budget_transaktionen
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pflegekassen_budgets b
      WHERE b.id = budget_id AND b.profil_id = auth.uid()
    )
  );

CREATE POLICY "transaktionen_insert_own" ON public.budget_transaktionen
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pflegekassen_budgets b
      WHERE b.id = budget_id AND b.profil_id = auth.uid()
    )
  );

CREATE POLICY "transaktionen_delete_own" ON public.budget_transaktionen
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.pflegekassen_budgets b
      WHERE b.id = budget_id AND b.profil_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- 3. haushaltsscheck_daten
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.haushaltsscheck_daten (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  arbeitgeber_name      text NOT NULL,
  arbeitgeber_adresse   text NOT NULL,
  arbeitnehmer_name     text NOT NULL,
  arbeitnehmer_svnr     text NOT NULL,
  stundenlohn           numeric(8,2) NOT NULL,
  stunden_pro_woche     numeric(5,2) NOT NULL,
  beginn_datum          date NOT NULL,
  aktiv                 boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_haushaltsscheck_daten_profil_id
  ON public.haushaltsscheck_daten (profil_id);

ALTER TABLE public.haushaltsscheck_daten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "haushaltsscheck_select_own" ON public.haushaltsscheck_daten
  FOR SELECT USING (profil_id = auth.uid());

CREATE POLICY "haushaltsscheck_insert_own" ON public.haushaltsscheck_daten
  FOR INSERT WITH CHECK (profil_id = auth.uid());

CREATE POLICY "haushaltsscheck_update_own" ON public.haushaltsscheck_daten
  FOR UPDATE USING (profil_id = auth.uid());

CREATE POLICY "haushaltsscheck_delete_own" ON public.haushaltsscheck_daten
  FOR DELETE USING (profil_id = auth.uid());

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_haushaltsscheck_daten_updated_at'
  ) THEN
    CREATE TRIGGER trg_haushaltsscheck_daten_updated_at
      BEFORE UPDATE ON public.haushaltsscheck_daten
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

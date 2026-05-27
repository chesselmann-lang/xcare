-- ============================================================
-- F25: Digitale Patientenverfügung & Vorsorgevollmacht
-- ============================================================

-- ENUM types
CREATE TYPE public.pv_typ AS ENUM (
  'patientenverfuegung',
  'vorsorgevollmacht',
  'betreuungsverfuegung'
);

CREATE TYPE public.pv_status AS ENUM (
  'entwurf',
  'fertig',
  'widerrufen'
);

-- Main table: Patientenverfügungen
CREATE TABLE IF NOT EXISTS public.patientenverfuegungen (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  typ               public.pv_typ NOT NULL,
  status            public.pv_status NOT NULL DEFAULT 'entwurf',
  inhalt            jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_url           text,
  qr_code_token     text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  erstellt_am       timestamptz NOT NULL DEFAULT now(),
  aktualisiert_am   timestamptz NOT NULL DEFAULT now(),
  widerrufen_am     timestamptz
);

-- Bevollmächtigte (people granted power of attorney)
CREATE TABLE IF NOT EXISTS public.pv_bevollmaechtigte (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verfuegung_id   uuid NOT NULL REFERENCES public.patientenverfuegungen(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  beziehung       text,
  telefon         text,
  email           text,
  adresse         text,
  prioritaet      integer NOT NULL DEFAULT 1,
  erstellt_am     timestamptz NOT NULL DEFAULT now()
);

-- Version history
CREATE TABLE IF NOT EXISTS public.pv_versionen (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verfuegung_id   uuid NOT NULL REFERENCES public.patientenverfuegungen(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_nr      integer NOT NULL,
  inhalt_snapshot jsonb NOT NULL,
  erstellt_am     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (verfuegung_id, version_nr)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patientenverfuegungen_user_id ON public.patientenverfuegungen(user_id);
CREATE INDEX IF NOT EXISTS idx_patientenverfuegungen_status ON public.patientenverfuegungen(status);
CREATE INDEX IF NOT EXISTS idx_pv_bevollmaechtigte_verfuegung ON public.pv_bevollmaechtigte(verfuegung_id);
CREATE INDEX IF NOT EXISTS idx_pv_versionen_verfuegung ON public.pv_versionen(verfuegung_id);

-- Trigger: keep aktualisiert_am up to date
CREATE OR REPLACE FUNCTION public.pv_set_aktualisiert_am()
RETURNS TRIGGER AS $$
BEGIN
  NEW.aktualisiert_am = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_patientenverfuegungen_aktualisiert_am
  BEFORE UPDATE ON public.patientenverfuegungen
  FOR EACH ROW EXECUTE FUNCTION public.pv_set_aktualisiert_am();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.patientenverfuegungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pv_bevollmaechtigte ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pv_versionen ENABLE ROW LEVEL SECURITY;

-- patientenverfuegungen: owner only
CREATE POLICY "pv_own_select" ON public.patientenverfuegungen
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "pv_own_insert" ON public.patientenverfuegungen
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pv_own_update" ON public.patientenverfuegungen
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pv_own_delete" ON public.patientenverfuegungen
  FOR DELETE USING (auth.uid() = user_id);

-- pv_bevollmaechtigte: owner only (via user_id column)
CREATE POLICY "pvb_own_select" ON public.pv_bevollmaechtigte
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "pvb_own_insert" ON public.pv_bevollmaechtigte
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pvb_own_update" ON public.pv_bevollmaechtigte
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pvb_own_delete" ON public.pv_bevollmaechtigte
  FOR DELETE USING (auth.uid() = user_id);

-- pv_versionen: owner only
CREATE POLICY "pvv_own_select" ON public.pv_versionen
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "pvv_own_insert" ON public.pv_versionen
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pvv_own_delete" ON public.pv_versionen
  FOR DELETE USING (auth.uid() = user_id);

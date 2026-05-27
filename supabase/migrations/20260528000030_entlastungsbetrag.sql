-- ============================================================
-- F36: Entlastungsleistungs-Tracker §45a/b SGB XI
-- ============================================================

-- Nutzungseinträge: Einzelausgaben gegen das §45b-Budget (125 €/Monat)
CREATE TABLE IF NOT EXISTS public.entlastungsbetrag_nutzung (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  jahr                  INT NOT NULL CHECK (jahr BETWEEN 2020 AND 2030),
  monat                 INT NOT NULL CHECK (monat BETWEEN 1 AND 12),
  betrag_cent           INT NOT NULL CHECK (betrag_cent > 0),
  leistungsart          TEXT NOT NULL,
  anbieter              TEXT,
  belegnummer           TEXT,
  notiz                 TEXT,
  erstattung_beantragt  BOOLEAN DEFAULT false,
  erstattung_erhalten   BOOLEAN DEFAULT false,
  erstellt_am           TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, jahr, monat, id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entlastung_nutzung_user_jahr
  ON public.entlastungsbetrag_nutzung(user_id, jahr);

CREATE INDEX IF NOT EXISTS idx_entlastung_nutzung_erstattung
  ON public.entlastungsbetrag_nutzung(user_id, erstattung_beantragt);

-- RLS
ALTER TABLE public.entlastungsbetrag_nutzung ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entlastung_nutzung_select" ON public.entlastungsbetrag_nutzung
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "entlastung_nutzung_insert" ON public.entlastungsbetrag_nutzung
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "entlastung_nutzung_update" ON public.entlastungsbetrag_nutzung
  FOR UPDATE USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "entlastung_nutzung_delete" ON public.entlastungsbetrag_nutzung
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- Einstellungen je Nutzer (Pflegegrad, Kasse, Budget-Übertrag)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.entlastungsbetrag_einstellungen (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  pflegegrad            INT CHECK (pflegegrad BETWEEN 1 AND 5),
  jahresbudget_cent     INT DEFAULT 150000,   -- §45b: 125 € × 12 = 1.500 €
  uebertrag_vorjahr_cent INT DEFAULT 0,       -- nicht genutzter Betrag des Vorjahres
  kasse_name            TEXT,
  kasse_kundennummer    TEXT,
  erinnerung_aktiv      BOOLEAN DEFAULT true,
  erstellt_am           TIMESTAMPTZ DEFAULT now(),
  aktualisiert_am       TIMESTAMPTZ DEFAULT now()
);

-- Trigger: aktualisiert_am automatisch setzen
CREATE OR REPLACE FUNCTION public.entlastung_einstellungen_set_aktualisiert_am()
RETURNS TRIGGER AS $$
BEGIN
  NEW.aktualisiert_am = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entlastung_einstellungen_aktualisiert_am
  BEFORE UPDATE ON public.entlastungsbetrag_einstellungen
  FOR EACH ROW EXECUTE FUNCTION public.entlastung_einstellungen_set_aktualisiert_am();

-- RLS
ALTER TABLE public.entlastungsbetrag_einstellungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entlastung_einstellungen_select" ON public.entlastungsbetrag_einstellungen
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "entlastung_einstellungen_insert" ON public.entlastungsbetrag_einstellungen
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "entlastung_einstellungen_update" ON public.entlastungsbetrag_einstellungen
  FOR UPDATE USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "entlastung_einstellungen_delete" ON public.entlastungsbetrag_einstellungen
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

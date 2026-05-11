-- ============================================
-- Migration: anspruchs_profile
-- Speichert deterministisch berechnete Anspruchs-Ergebnisse pro Nutzer.
-- COMPLIANCE: Kein LLM-Output gespeichert, nur regelbasierte Berechnungen.
-- ============================================

CREATE TABLE IF NOT EXISTS anspruchs_profile (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lebenslage  text NOT NULL,
  bezeichnung text,                          -- optionaler Nutzer-Label (z.B. "Mutter, PG3")
  ergebnis    jsonb NOT NULL,                -- vollständiges AnspruchsErgebnis als JSON
  gesamt_monatlich_eur numeric(10,2),        -- denormalisiert für schnelle Sortierung
  gesamt_jaehrlich_eur  numeric(10,2),
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

-- Index für schnellen Lookup pro Nutzer (neueste zuerst)
CREATE INDEX IF NOT EXISTS idx_anspruchs_profile_user_created
  ON anspruchs_profile(user_id, created_at DESC);

-- Index für Lebenslage-Filterung
CREATE INDEX IF NOT EXISTS idx_anspruchs_profile_lebenslage
  ON anspruchs_profile(user_id, lebenslage);

-- updated_at automatisch setzen
CREATE OR REPLACE FUNCTION update_anspruchs_profile_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_anspruchs_profile_updated_at
  BEFORE UPDATE ON anspruchs_profile
  FOR EACH ROW EXECUTE FUNCTION update_anspruchs_profile_updated_at();

-- RLS: Nutzer sehen und verwalten nur ihre eigenen Datensätze
ALTER TABLE anspruchs_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nutzer_eigene_anspruchs_profile"
  ON anspruchs_profile
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Max 50 gespeicherte Profile pro Nutzer (verhindert Missbrauch)
CREATE OR REPLACE FUNCTION check_anspruchs_profile_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT COUNT(*) FROM anspruchs_profile WHERE user_id = NEW.user_id) >= 50 THEN
    RAISE EXCEPTION 'Maximale Anzahl gespeicherter Anspruchs-Profile (50) erreicht.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_anspruchs_profile_limit
  BEFORE INSERT ON anspruchs_profile
  FOR EACH ROW EXECUTE FUNCTION check_anspruchs_profile_limit();

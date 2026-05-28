-- ============================================================
-- F44: Sturzprävention-Assessment
-- ============================================================

-- ── 1. Sturz-Risiko-Assessment (Morse-Skala adaptiert) ────────────────────────
CREATE TABLE IF NOT EXISTS sturz_assessment (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- Assessment-Datum
  assessment_datum      DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Morse Fall Scale Items (0/10/15/20/25)
  sturzhistorie         INT DEFAULT 0 CHECK (sturzhistorie IN (0,25)),          -- Sturz in letzten 3 Monaten
  zweitdiagnose         INT DEFAULT 0 CHECK (zweitdiagnose IN (0,15)),           -- Mehr als eine Diagnose
  gehhilfe              INT DEFAULT 0 CHECK (gehhilfe IN (0,15,30)),             -- 0=nein, 15=Krücken/Rollator, 30=Möbel
  heparin_iv            INT DEFAULT 0 CHECK (heparin_iv IN (0,20)),              -- IV / Heparin-Lock
  gangbild              INT DEFAULT 0 CHECK (gangbild IN (0,10,20)),             -- 0=normal, 10=beeintr., 20=stark
  orientierung          INT DEFAULT 0 CHECK (orientierung IN (0,15)),            -- Überschätzt eigene Fähigkeiten
  -- Gesamtscore
  gesamtscore           INT GENERATED ALWAYS AS (sturzhistorie + zweitdiagnose + gehhilfe + heparin_iv + gangbild + orientierung) STORED,
  -- Risikostufe
  risikostufe           TEXT GENERATED ALWAYS AS (
    CASE
      WHEN (sturzhistorie + zweitdiagnose + gehhilfe + heparin_iv + gangbild + orientierung) < 25 THEN 'gering'
      WHEN (sturzhistorie + zweitdiagnose + gehhilfe + heparin_iv + gangbild + orientierung) < 45 THEN 'mittel'
      ELSE 'hoch'
    END
  ) STORED,
  -- Maßnahmen
  massnahmen            JSONB NOT NULL DEFAULT '[]'::jsonb,
  notizen               TEXT,
  durchgefuehrt_von     TEXT,
  naechstes_assessment  DATE,
  erstellt_am           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sturz_assessment_user_datum_idx ON sturz_assessment(user_id, assessment_datum DESC);
ALTER TABLE sturz_assessment ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "sturz_select" ON sturz_assessment FOR SELECT USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "sturz_insert" ON sturz_assessment FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "sturz_update" ON sturz_assessment FOR UPDATE USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Sturz-Ereignisse ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sturz_ereignisse (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ereignis_datum  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ort             TEXT,
  ursache         TEXT,
  verletzung      TEXT,
  arzt_informiert BOOLEAN DEFAULT false,
  krankenhauseinw BOOLEAN DEFAULT false,
  massnahmen_nach TEXT,
  notizen         TEXT,
  erstellt_am     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sturz_ereignisse ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "sturz_ereig_select" ON sturz_ereignisse FOR SELECT USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "sturz_ereig_insert" ON sturz_ereignisse FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "sturz_ereig_update" ON sturz_ereignisse FOR UPDATE USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

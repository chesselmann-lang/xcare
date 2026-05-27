-- ============================================================
-- F26: Pflegehilfsmittel-Marktplatz (§40 SGB XI)
-- ============================================================

-- Erstattungstyp ENUM
DO $$ BEGIN
  CREATE TYPE erstattung_typ_enum AS ENUM ('verbrauch', 'leih', 'kauf');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Produktkatalog ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pflegehilfsmittel (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  hersteller          TEXT,
  pg_nummer           TEXT NOT NULL,
  pg_bezeichnung      TEXT NOT NULL,
  hilfsmittel_nummer  TEXT,
  beschreibung        TEXT,
  indikation          TEXT,
  erstattungsfaehig   BOOLEAN DEFAULT true,
  erstattung_typ      erstattung_typ_enum DEFAULT 'verbrauch',
  preis_cent          INT,
  einheit             TEXT DEFAULT 'Stück',
  pflegegrad_ab       INT DEFAULT 1 CHECK (pflegegrad_ab BETWEEN 1 AND 5),
  bild_url            TEXT,
  lieferant_name      TEXT,
  lieferant_url       TEXT,
  aktiv               BOOLEAN DEFAULT true,
  erstellt_am         TIMESTAMPTZ DEFAULT now()
);

-- ── Hilfsmittel-Antraege ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hilfsmittel_antraege (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hilfsmittel_id        UUID REFERENCES public.pflegehilfsmittel(id),
  pflegegrad            INT CHECK (pflegegrad BETWEEN 1 AND 5),
  krankenkasse          TEXT,
  ikk_nummer            TEXT,
  status                TEXT CHECK (status IN ('entwurf','eingereicht','bewilligt','abgelehnt','widerspruch')) DEFAULT 'entwurf',
  monatliches_budget_cent INT DEFAULT 4000,
  verordnung_vorhanden  BOOLEAN DEFAULT false,
  arzt_name             TEXT,
  arzt_lanr             TEXT,
  notizen               TEXT,
  eingereicht_am        TIMESTAMPTZ,
  beschieden_am         TIMESTAMPTZ,
  erstellt_am           TIMESTAMPTZ DEFAULT now(),
  aktualisiert_am       TIMESTAMPTZ DEFAULT now()
);

-- ── Budget-Ausgaben pro Monat ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.hilfsmittel_ausgaben (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hilfsmittel_id   UUID REFERENCES public.pflegehilfsmittel(id),
  monat            DATE NOT NULL,
  menge            INT DEFAULT 1,
  preis_cent       INT,
  erstattet_cent   INT,
  eigenanteil_cent INT GENERATED ALWAYS AS (COALESCE(preis_cent, 0) - COALESCE(erstattet_cent, 0)) STORED,
  erstellt_am      TIMESTAMPTZ DEFAULT now()
);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.pflegehilfsmittel      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hilfsmittel_antraege   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hilfsmittel_ausgaben   ENABLE ROW LEVEL SECURITY;

-- pflegehilfsmittel: oeffentlich lesbar, kein Schreiben
DROP POLICY IF EXISTS "pflegehilfsmittel_public_read" ON public.pflegehilfsmittel;
CREATE POLICY "pflegehilfsmittel_public_read"
  ON public.pflegehilfsmittel FOR SELECT USING (aktiv = true);

-- hilfsmittel_antraege: nur eigene Zeilen
DROP POLICY IF EXISTS "antraege_own_select" ON public.hilfsmittel_antraege;
CREATE POLICY "antraege_own_select"
  ON public.hilfsmittel_antraege FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "antraege_own_insert" ON public.hilfsmittel_antraege;
CREATE POLICY "antraege_own_insert"
  ON public.hilfsmittel_antraege FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "antraege_own_update" ON public.hilfsmittel_antraege;
CREATE POLICY "antraege_own_update"
  ON public.hilfsmittel_antraege FOR UPDATE USING (auth.uid() = user_id);

-- hilfsmittel_ausgaben: nur eigene Zeilen
DROP POLICY IF EXISTS "ausgaben_own_select" ON public.hilfsmittel_ausgaben;
CREATE POLICY "ausgaben_own_select"
  ON public.hilfsmittel_ausgaben FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ausgaben_own_insert" ON public.hilfsmittel_ausgaben;
CREATE POLICY "ausgaben_own_insert"
  ON public.hilfsmittel_ausgaben FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ausgaben_own_update" ON public.hilfsmittel_ausgaben;
CREATE POLICY "ausgaben_own_update"
  ON public.hilfsmittel_ausgaben FOR UPDATE USING (auth.uid() = user_id);

-- ── Indizes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pflegehilfsmittel_pg      ON public.pflegehilfsmittel (pg_nummer);
CREATE INDEX IF NOT EXISTS idx_pflegehilfsmittel_typ     ON public.pflegehilfsmittel (erstattung_typ);
CREATE INDEX IF NOT EXISTS idx_antraege_user             ON public.hilfsmittel_antraege (user_id);
CREATE INDEX IF NOT EXISTS idx_ausgaben_user_monat       ON public.hilfsmittel_ausgaben (user_id, monat);

-- ── Seed-Daten ───────────────────────────────────────────────
INSERT INTO public.pflegehilfsmittel
  (name, hersteller, pg_nummer, pg_bezeichnung, hilfsmittel_nummer, beschreibung, indikation,
   erstattungsfaehig, erstattung_typ, preis_cent, einheit, pflegegrad_ab, lieferant_name)
VALUES
  ('Inkontinenzeinlagen Niveau 2', 'TENA', '54', 'Inkontinenzmaterial', '5402001',
   'Saugstarke Einlagen der Stufe 2 fuer mittlere Harninkontinenz, Packung a 28 Stueck.',
   'Mittlere Harninkontinenz', true, 'verbrauch', 399, 'Packung', 1, 'Sanitaetshaus Mueller'),

  ('Einmalhandschuhe Nitril Groesse M', 'Hartmann', '54', 'Inkontinenzmaterial', '5499001',
   'Latexfreie Nitril-Einmalhandschuhe, puderlos, Box a 100 Stueck.',
   'Pflegehygiene, Infektionsschutz', true, 'verbrauch', 850, 'Box', 1, 'MedSupply GmbH'),

  ('Bettschutzeinlagen wiederverwendbar', 'Suprima', '51', 'Pflegehilfsmittel zum Verbrauch', '5101001',
   'Waschbare Bettschutzunterlage 90x75 cm, bis 60 Grad waschbar.',
   'Inkontinenzschutz im Bett', true, 'verbrauch', 1290, 'Stueck', 1, 'Pflegedirekt24'),

  ('Haendedesinfektionsmittel 500 ml', 'Sterillium', '51', 'Pflegehilfsmittel zum Verbrauch', '5102001',
   'Alkoholisches Haendedesinfektionsmittel, 500-ml-Pumpflasche, EN 1500 geprueft.',
   'Haendehygiene in der haeuslichen Pflege', true, 'verbrauch', 680, 'Stueck', 1, 'Sanitaetshaus Mueller'),

  ('Mundschutz FFP2 10er-Pack', '3M', '51', 'Pflegehilfsmittel zum Verbrauch', '5103001',
   'FFP2-Atemschutzmasken ohne Ventil, einzeln verpackt, CE-zertifiziert.',
   'Atemschutz bei Pflegemassnahmen', true, 'verbrauch', 550, 'Packung', 1, 'MedSupply GmbH'),

  ('Badewannenlifter elektrisch', 'Mangar', '26', 'Badehilfen', '2601001',
   'Elektrischer Badewannenlifter, tragfaehig bis 160 kg, einfache Bedienung per Handschalter.',
   'Eingeschraenkte Mobilitaet beim Baden', true, 'leih', 45000, 'Stueck', 2, 'Reha-Service Nord'),

  ('Rollator faltbar leicht', 'Drive Medical', '22', 'Gehhilfen', '2201001',
   'Leichtgewicht-Rollator aus Aluminium, faltbar, mit Sitz und Beutel, Gewicht 6,5 kg.',
   'Eingeschraenkte Gehfaehigkeit', true, 'kauf', 18900, 'Stueck', 2, 'Sanitaetshaus Mueller'),

  ('Gehstock hoehenverstellbar', 'Ergotech', '22', 'Gehhilfen', '2202001',
   'Leichter Aluminium-Gehstock, hoehenverstellbar 70 bis 95 cm, ergonomischer Griff.',
   'Leichte Gangstoeung, Gleichgewichtsprobleme', true, 'kauf', 2990, 'Stueck', 1, 'Pflegedirekt24'),

  ('Pflegebett elektrisch 3-motorig', 'Stiegelmeyer', '18', 'Pflegebetten', '1801001',
   'Elektrisch hoehenverstellbares Pflegebett mit Ruecken-, Bein- und Hoehenverstellung, Seitengitter.',
   'Pflegebedueftigkeit mit erhoetem Pflegeaufwand', true, 'leih', 89000, 'Monat', 3, 'Reha-Service Nord'),

  ('Kompressionsstruempfe Klasse II Kniestrumpf', 'Sigvaris', '11', 'Kompressionsstruempfe', '1101001',
   'Medizinische Kompressionsstruempfe Klasse II (23 bis 32 mmHg), Kniestrumpf, hautfarben.',
   'Chronisch-venoese Insuffizienz, Oedem', true, 'kauf', 2490, 'Paar', 1, 'Sanitaetshaus Mueller'),

  ('Knieorthese mit Gelenk', 'Bauerfeind', '50', 'Orthesen', '5001001',
   'Funktionelle Knieorthese mit Gelenkschienen, stufenlos einstellbar, atmungsaktives Material.',
   'Knieinstabilitaet, postoperative Versorgung', true, 'kauf', 8900, 'Stueck', 1, 'Reha-Service Nord'),

  ('Pflegetagebuch Vorlage Digital', 'xcare', '99', 'Sonstiges', NULL,
   'Digitale Vorlage fuer das Pflegetagebuch: Dokumentation von Pflegemassnahmen, Medikamentengaben und Terminen.',
   'Dokumentation in der haeuslichen Pflege', false, 'kauf', 0, 'kostenlos', 1, 'xcare GmbH')
ON CONFLICT DO NOTHING;

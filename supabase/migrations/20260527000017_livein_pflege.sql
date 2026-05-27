-- Live-in Pflege Agenturen (§8 SGB XI compliant)
CREATE TABLE IF NOT EXISTS public.livein_agenturen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  beschreibung text,
  herkunftslaender text[] DEFAULT ARRAY['Polen', 'Rumänien', 'Tschechien', 'Slowakei'],
  sprachen text[] DEFAULT ARRAY['Deutsch'],
  zertifizierungen text[] DEFAULT ARRAY[]::text[],
  anstellungsmodell text CHECK (anstellungsmodell IN ('arbeitnehmerüberlassung', 'entsendung', 'selbstständig', 'agentur')),
  preisrahmen_von integer, -- EUR/Monat
  preisrahmen_bis integer,
  verfuegbarkeit_tage integer DEFAULT 7, -- response time in days
  bewertung_schnitt numeric(3,2),
  anzahl_bewertungen integer DEFAULT 0,
  kontakt_email text,
  kontakt_telefon text,
  webseite text,
  verified boolean DEFAULT false,
  aktiv boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Care Worker Profile (24h live-in)
CREATE TABLE IF NOT EXISTS public.livein_pflegekraefte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agentur_id uuid REFERENCES public.livein_agenturen(id) ON DELETE SET NULL,
  vorname text NOT NULL,
  geschlecht text CHECK (geschlecht IN ('weiblich', 'männlich', 'divers')),
  herkunftsland text,
  sprachen text[] DEFAULT ARRAY[]::text[],
  qualifikationen text[] DEFAULT ARRAY[]::text[],
  erfahrung_jahre integer DEFAULT 0,
  pflegegrade_erfahrung integer[] DEFAULT ARRAY[1, 2, 3], -- Pflegegrade sie betreuen können
  demenz_erfahrung boolean DEFAULT false,
  fuehrerschein boolean DEFAULT false,
  raucherfrei boolean DEFAULT true,
  haustiere_ok boolean DEFAULT true,
  verfuegbar_ab date,
  rotationsintervall_wochen integer DEFAULT 6, -- weeks on, then rotates
  stundenlohn_brutto numeric(6,2),
  bild_url text,
  bio_kurz text,
  aktiv boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Matching requests
CREATE TABLE IF NOT EXISTS public.livein_anfragen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  agentur_id uuid REFERENCES public.livein_agenturen(id),
  pflegekraft_id uuid REFERENCES public.livein_pflegekraefte(id),
  -- Care recipient info
  pflegegrad integer CHECK (pflegegrad BETWEEN 1 AND 5),
  diagnosen text[],
  besondere_anforderungen text,
  -- Preferences
  bevorzugtes_geschlecht text,
  sprache_bevorzugt text,
  fuehrerschein_noetig boolean DEFAULT false,
  demenz_pflege boolean DEFAULT false,
  haustiere_vorhanden boolean DEFAULT false,
  -- Logistics
  unterkunft_beschreibung text,
  startdatum date,
  budget_monat integer, -- EUR
  bundesland text,
  ort text,
  -- Status
  status text DEFAULT 'neu' CHECK (status IN ('neu', 'kontaktiert', 'angebot_erhalten', 'vereinbart', 'aktiv', 'beendet', 'storniert')),
  notizen text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS livein_agenturen_verified_idx ON public.livein_agenturen(verified, aktiv);
CREATE INDEX IF NOT EXISTS livein_pflegekraefte_agentur_idx ON public.livein_pflegekraefte(agentur_id);
CREATE INDEX IF NOT EXISTS livein_anfragen_user_idx ON public.livein_anfragen(user_id);

-- RLS
ALTER TABLE public.livein_agenturen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livein_pflegekraefte ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livein_anfragen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "livein_agenturen_public_read" ON public.livein_agenturen FOR SELECT USING (verified = true AND aktiv = true);
CREATE POLICY "livein_pflegekraefte_public_read" ON public.livein_pflegekraefte FOR SELECT USING (aktiv = true);
CREATE POLICY "livein_anfragen_own" ON public.livein_anfragen FOR ALL USING (auth.uid() = user_id);

-- Seed demo agencies
INSERT INTO public.livein_agenturen (name, slug, beschreibung, herkunftslaender, sprachen, anstellungsmodell, preisrahmen_von, preisrahmen_bis, kontakt_email, kontakt_telefon, verified) VALUES
  ('CareConnect Europa GmbH', 'careconnect-europa', 'Seriöse 24h-Pflege aus Polen und Tschechien. Alle Pflegekräfte sozialversicherungspflichtig angestellt.', ARRAY['Polen', 'Tschechien'], ARRAY['Deutsch', 'Polnisch', 'Tschechisch'], 'arbeitnehmerüberlassung', 2200, 3200, 'info@careconnect-europa.de', '030 4456789', true),
  ('Osteuropäische Pflegehilfe OHG', 'oep-pflege', '24h Betreuung im eigenen Zuhause — seit 15 Jahren erfahren.', ARRAY['Polen', 'Rumänien', 'Slowakei'], ARRAY['Deutsch', 'Polnisch', 'Rumänisch'], 'entsendung', 1800, 2800, 'kontakt@oep-pflege.de', '040 7823456', true),
  ('Familienpflege International', 'familienpflege-intl', 'Spezialisiert auf Demenzpflege und schwere Pflegegrade.', ARRAY['Polen', 'Ungarn'], ARRAY['Deutsch', 'Polnisch', 'Ungarisch'], 'agentur', 2500, 3800, 'info@familienpflege-intl.de', '089 5567890', true)
ON CONFLICT DO NOTHING;

-- Course providers
CREATE TABLE IF NOT EXISTS public.kurs_anbieter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  beschreibung text,
  zertifizierungen text[] DEFAULT ARRAY[]::text[], -- e.g. ['AZAV', 'DGQ', 'TÜV']
  webseite text,
  kontakt_email text,
  logo_url text,
  bundeslaender text[] DEFAULT ARRAY['bundesweit'],
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Courses
CREATE TABLE IF NOT EXISTS public.kurse (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id uuid REFERENCES public.kurs_anbieter(id) ON DELETE CASCADE,
  titel text NOT NULL,
  slug text,
  beschreibung text NOT NULL,
  kategorie text NOT NULL CHECK (kategorie IN (
    'grundpflege', 'behandlungspflege', 'palliativpflege', 'demenzpflege',
    'wundversorgung', 'beatmung', 'hygiene', 'recht_dokumentation',
    'fuehrung_management', 'erste_hilfe', 'digitalisierung', 'sonstiges'
  )),
  niveau text DEFAULT 'grundkurs' CHECK (niveau IN ('grundkurs', 'aufbaukurs', 'fortgeschritten', 'experte', 'zertifikat')),
  format text DEFAULT 'praesenz' CHECK (format IN ('praesenz', 'online', 'hybrid', 'e_learning')),
  dauer_stunden integer NOT NULL,
  dauer_tage integer,
  max_teilnehmer integer,
  preis_regulaer numeric(8,2) NOT NULL,
  preis_foerderung numeric(8,2), -- after subsidy
  foerderung_moeglich boolean DEFAULT false,
  foerderung_info text, -- e.g. "Förderung nach §82c SGB XI möglich"
  zertifikat_erhalten boolean DEFAULT true,
  zertifikat_name text,
  voraussetzungen text[],
  lernziele text[],
  inhalte_stichpunkte text[],
  naechste_termine jsonb DEFAULT '[]'::jsonb, -- [{datum, ort, freie_plaetze}]
  bundesland text,
  ort text,
  online_link text,
  bewertung_schnitt numeric(3,2) DEFAULT 0,
  anzahl_bewertungen integer DEFAULT 0,
  aktiv boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Bookings
CREATE TABLE IF NOT EXISTS public.kurs_buchungen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kurs_id uuid REFERENCES public.kurse(id) ON DELETE CASCADE,
  termin_datum date,
  status text DEFAULT 'angemeldet' CHECK (status IN ('angemeldet', 'bestaetigt', 'bezahlt', 'abgeschlossen', 'storniert')),
  arbeitgeber_zahlt boolean DEFAULT false,
  zertifikat_ausgestellt boolean DEFAULT false,
  zertifikat_url text,
  bewertung integer CHECK (bewertung BETWEEN 1 AND 5),
  bewertung_text text,
  preis_bezahlt numeric(8,2),
  erstellt_am timestamptz DEFAULT now()
);

-- User learning progress
CREATE TABLE IF NOT EXISTS public.lernfortschritt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kurs_id uuid REFERENCES public.kurse(id) ON DELETE CASCADE,
  fortschritt_prozent integer DEFAULT 0,
  letzte_aktivitaet timestamptz DEFAULT now(),
  abgeschlossen boolean DEFAULT false,
  abgeschlossen_am timestamptz,
  UNIQUE(user_id, kurs_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS kurse_kategorie_idx ON public.kurse(kategorie);
CREATE INDEX IF NOT EXISTS kurse_format_idx ON public.kurse(format);
CREATE INDEX IF NOT EXISTS kurse_anbieter_idx ON public.kurse(anbieter_id);
CREATE INDEX IF NOT EXISTS kurs_buchungen_user_idx ON public.kurs_buchungen(user_id);

-- RLS
ALTER TABLE public.kurs_anbieter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kurse ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kurs_buchungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lernfortschritt ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kurs_anbieter_public" ON public.kurs_anbieter FOR SELECT USING (verified = true);
CREATE POLICY "kurse_public" ON public.kurse FOR SELECT USING (aktiv = true);
CREATE POLICY "buchungen_own" ON public.kurs_buchungen FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "lernfortschritt_own" ON public.lernfortschritt FOR ALL USING (auth.uid() = user_id);

-- Seed providers
INSERT INTO public.kurs_anbieter (name, beschreibung, zertifizierungen, bundeslaender, kontakt_email, verified) VALUES
  ('Pflegeakademie Deutschland', 'Führende Fortbildungsstätte für Pflegeberufe mit AZAV-Zertifizierung', ARRAY['AZAV', 'DGQ'], ARRAY['bundesweit'], 'info@pflegeakademie-de.de', true),
  ('CareDemy Online', 'E-Learning Plattform für Pflegefachkräfte — lernen wann und wo Sie wollen', ARRAY['TÜV Rheinland'], ARRAY['bundesweit'], 'info@caredemy.de', true),
  ('Akademie für Gesundheitsberufe München', 'Präsenzkurse in München und Umgebung', ARRAY['AZAV'], ARRAY['Bayern'], 'info@afg-muenchen.de', true)
ON CONFLICT DO NOTHING;

-- Seed courses
INSERT INTO public.kurse (anbieter_id, titel, beschreibung, kategorie, niveau, format, dauer_stunden, preis_regulaer, preis_foerderung, foerderung_moeglich, foerderung_info, zertifikat_erhalten, zertifikat_name, lernziele, naechste_termine, bundesland, aktiv)
SELECT
  a.id,
  'Palliativpflege Grundkurs (40h)',
  'Umfassende Einführung in die palliative Versorgung. Schmerz- und Symptommanagement, psychosoziale Begleitung, Kommunikation mit Sterbenden und Angehörigen.',
  'palliativpflege',
  'grundkurs',
  'hybrid',
  40,
  890,
  445,
  true,
  'Förderung nach §82c SGB XI möglich — fragen Sie Ihren Arbeitgeber',
  true,
  'Zertifikat Palliative Care (DGP)',
  ARRAY['Schmerz- und Symptommanagement', 'Kommunikation in der letzten Lebensphase', 'Ethische Entscheidungsfindung'],
  '[{"datum":"2026-07-15","ort":"Berlin","freie_plaetze":8},{"datum":"2026-09-10","ort":"Online","freie_plaetze":20}]'::jsonb,
  'bundesweit',
  true
FROM public.kurs_anbieter a WHERE a.name = 'Pflegeakademie Deutschland'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.kurse (anbieter_id, titel, beschreibung, kategorie, niveau, format, dauer_stunden, preis_regulaer, foerderung_moeglich, zertifikat_erhalten, zertifikat_name, lernziele, naechste_termine, aktiv)
SELECT
  a.id,
  'Demenzpflege Aufbaukurs',
  'Vertiefte Kenntnisse in der Betreuung von Menschen mit Demenz. Validation, Biographiearbeit, herausforderndes Verhalten verstehen und begegnen.',
  'demenzpflege',
  'aufbaukurs',
  'online',
  16,
  290,
  true,
  true,
  'Zertifikat Demenzbegleiter',
  ARRAY['Validation nach Feil', 'Biographiearbeit', 'BPSD-Management'],
  '[{"datum":"2026-06-20","ort":"Online","freie_plaetze":30}]'::jsonb,
  true
FROM public.kurs_anbieter a WHERE a.name = 'CareDemy Online'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.kurse (anbieter_id, titel, beschreibung, kategorie, niveau, format, dauer_stunden, preis_regulaer, preis_foerderung, foerderung_moeglich, foerderung_info, zertifikat_erhalten, lernziele, naechste_termine, bundesland, aktiv)
SELECT
  a.id,
  'Wundversorgung nach WundD-Standard',
  'Moderne Wundversorgung für Pflegefachkräfte: Dekubitusprophylaxe, feuchte Wundversorgung, Kompressionstherapie, Dokumentation.',
  'wundversorgung',
  'grundkurs',
  'praesenz',
  24,
  450,
  225,
  true,
  'AWO/Bildungsgutschein möglich',
  true,
  ARRAY['Wundheilung verstehen', 'Moderne Wundauflagen', 'Dekubitusprophylaxe'],
  '[{"datum":"2026-08-05","ort":"München","freie_plaetze":12}]'::jsonb,
  'Bayern',
  true
FROM public.kurs_anbieter a WHERE a.name = 'Akademie für Gesundheitsberufe München'
LIMIT 1
ON CONFLICT DO NOTHING;

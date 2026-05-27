-- ============================================================
-- F28: Heimsuche & Pflegeheim-Vergleich
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pflegeheime (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                            TEXT NOT NULL,
  traeger                         TEXT,
  traeger_typ                     TEXT CHECK (traeger_typ IN ('freigemeinnuetzig','privat','oeffentlich')),
  strasse                         TEXT,
  hausnummer                      TEXT,
  plz                             TEXT NOT NULL,
  ort                             TEXT NOT NULL,
  bundesland                      TEXT,
  lat                             NUMERIC(9,6),
  lng                             NUMERIC(9,6),
  telefon                         TEXT,
  email                           TEXT,
  webseite                        TEXT,
  plaetze_gesamt                  INT,
  plaetze_verfuegbar              INT,
  wartezeit_monate                INT,
  spezialisierungen               TEXT[],
  sprachen                        TEXT[],
  -- Costs (monthly, in cents)
  eigenanteil_pflegekosten_cent   INT,
  kosten_unterkunft_cent          INT,
  kosten_verpflegung_cent         INT,
  kosten_investition_cent         INT,
  eigenanteil_gesamt_cent         INT GENERATED ALWAYS AS (
    COALESCE(eigenanteil_pflegekosten_cent, 0) +
    COALESCE(kosten_unterkunft_cent, 0) +
    COALESCE(kosten_verpflegung_cent, 0) +
    COALESCE(kosten_investition_cent, 0)
  ) STORED,
  -- Quality
  mdk_note                        NUMERIC(3,1),
  qualitaet_pflege                INT CHECK (qualitaet_pflege BETWEEN 1 AND 100),
  qualitaet_alltag                INT CHECK (qualitaet_alltag BETWEEN 1 AND 100),
  letzte_pruefung                 DATE,
  -- Features
  einzelzimmer_verfuegbar         BOOLEAN DEFAULT true,
  haustiere_erlaubt               BOOLEAN DEFAULT false,
  besuchszeiten                   TEXT,
  verpflegung_detail              TEXT,
  aktivitaeten                    TEXT[],
  aktiv                           BOOLEAN DEFAULT true,
  erstellt_am                     TIMESTAMPTZ DEFAULT now()
);

-- User watchlist / favorites
CREATE TABLE IF NOT EXISTS public.heim_merkliste (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  heim_id                   UUID REFERENCES public.pflegeheime(id) ON DELETE CASCADE,
  notizen                   TEXT,
  kontaktiert_am            DATE,
  warteliste_angemeldet     BOOLEAN DEFAULT false,
  besichtigungs_termin      TIMESTAMPTZ,
  erstellt_am               TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, heim_id)
);

-- Eigenanteil calculator saves
CREATE TABLE IF NOT EXISTS public.eigenanteil_berechnungen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pflegegrad      INT CHECK (pflegegrad BETWEEN 1 AND 5),
  einkommen_cent  INT,
  vermoegen_cent  INT,
  heim_id         UUID REFERENCES public.pflegeheime(id),
  ergebnis        JSONB,
  erstellt_am     TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.pflegeheime ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heim_merkliste ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eigenanteil_berechnungen ENABLE ROW LEVEL SECURITY;

-- pflegeheime: public read
CREATE POLICY "pflegeheime_public_read"
  ON public.pflegeheime FOR SELECT
  USING (aktiv = true);

-- heim_merkliste: user-scoped
CREATE POLICY "heim_merkliste_select_own"
  ON public.heim_merkliste FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "heim_merkliste_insert_own"
  ON public.heim_merkliste FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "heim_merkliste_update_own"
  ON public.heim_merkliste FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "heim_merkliste_delete_own"
  ON public.heim_merkliste FOR DELETE
  USING (auth.uid() = user_id);

-- eigenanteil_berechnungen: user-scoped
CREATE POLICY "eigenanteil_select_own"
  ON public.eigenanteil_berechnungen FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "eigenanteil_insert_own"
  ON public.eigenanteil_berechnungen FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "eigenanteil_delete_own"
  ON public.eigenanteil_berechnungen FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Seed: 8 realistic nursing homes across Germany
-- ============================================================

INSERT INTO public.pflegeheime (
  name, traeger, traeger_typ, strasse, hausnummer, plz, ort, bundesland,
  lat, lng, telefon, email, webseite,
  plaetze_gesamt, plaetze_verfuegbar, wartezeit_monate,
  spezialisierungen, sprachen,
  eigenanteil_pflegekosten_cent, kosten_unterkunft_cent, kosten_verpflegung_cent, kosten_investition_cent,
  mdk_note, qualitaet_pflege, qualitaet_alltag, letzte_pruefung,
  einzelzimmer_verfuegbar, haustiere_erlaubt, besuchszeiten, verpflegung_detail, aktivitaeten
) VALUES

-- 1. Berlin
(
  'Seniorenresidenz Am Stadtpark', 'Korian Deutschland GmbH', 'privat',
  'Potsdamer Straße', '182', '10785', 'Berlin', 'Berlin',
  52.500500, 13.366700,
  '+49 30 25492100', 'info@stadtpark-berlin.de', 'https://www.korian.de',
  120, 8, 2,
  ARRAY['demenz','kurzzeitpflege'], ARRAY['Deutsch','Englisch','Türkisch'],
  230000, 85000, 60000, 55000,
  1.3, 91, 88, '2025-11-15',
  true, false, 'täglich 09:00–20:00',
  '3 Mahlzeiten + Snacks, vegetarisch und halal möglich',
  ARRAY['gedaechtnistraining','musik','garten','ausfluge','yoga']
),

-- 2. München
(
  'Haus Waldfrieden', 'Caritas München', 'freigemeinnuetzig',
  'Theresienhöhe', '11', '80331', 'München', 'Bayern',
  48.133600, 11.549800,
  '+49 89 54321900', 'waldfrieden@caritas-muenchen.de', 'https://www.caritas-muenchen.de',
  85, 3, 4,
  ARRAY['demenz','beatmung'], ARRAY['Deutsch','Englisch','Russisch'],
  280000, 90000, 65000, 62000,
  1.7, 86, 83, '2025-09-20',
  true, true, 'täglich 10:00–19:00',
  '3 Mahlzeiten + Snacks, vegetarisch möglich, Diätkost auf Anfrage',
  ARRAY['gedaechtnistraining','musik','garten','backen','tierbesuch']
),

-- 3. Hamburg
(
  'Curanum Pflegeheim Hamburg', 'Curanum AG', 'privat',
  'Steinstraße', '7', '20095', 'Hamburg', 'Hamburg',
  53.550700, 10.000700,
  '+49 40 30609100', 'hamburg@curanum.de', 'https://www.curanum.de',
  200, 15, 1,
  ARRAY['kurzzeitpflege','wachkoma'], ARRAY['Deutsch','Englisch','Polnisch'],
  195000, 80000, 58000, 48000,
  2.1, 78, 75, '2025-10-05',
  true, false, 'täglich 08:00–21:00',
  '3 Mahlzeiten + Snacks, verschiedene Kostformen möglich',
  ARRAY['musik','malen','ausfluge','gedaechtnistraining']
),

-- 4. Köln
(
  'Diakonie Pflegezentrum Köln', 'Diakonie Köln und Region', 'freigemeinnuetzig',
  'Domkloster', '3', '50667', 'Köln', 'Nordrhein-Westfalen',
  50.941400, 6.957700,
  '+49 221 16093200', 'pflege@diakonie-koeln.de', 'https://www.diakonie-koeln.de',
  110, 5, 3,
  ARRAY['demenz','kurzzeitpflege'], ARRAY['Deutsch','Englisch','Arabisch'],
  210000, 75000, 55000, 52000,
  1.5, 89, 86, '2025-12-01',
  true, false, 'täglich 09:00–19:30',
  '3 Mahlzeiten + Nachmittagskaffee, vegetarisch, koscher auf Anfrage',
  ARRAY['gedaechtnistraining','garten','musik','andacht','ausfluge']
),

-- 5. Frankfurt
(
  'AWO Seniorenzentrum Frankfurt', 'Arbeiterwohlfahrt Frankfurt am Main e.V.', 'freigemeinnuetzig',
  'Kaiserstraße', '59', '60313', 'Frankfurt am Main', 'Hessen',
  50.110900, 8.682100,
  '+49 69 29801500', 'seniorenzentrum@awo-frankfurt.de', 'https://www.awo-frankfurt.de',
  95, 6, 2,
  ARRAY['demenz','kurzzeitpflege'], ARRAY['Deutsch','Englisch','Französisch'],
  220000, 78000, 57000, 50000,
  1.6, 84, 81, '2025-08-12',
  true, true, 'täglich 09:00–20:00',
  '3 Mahlzeiten + Snacks, vegetarisch und vegan möglich',
  ARRAY['gedaechtnistraining','malen','musik','backen','garten']
),

-- 6. Dresden
(
  'Vitanas Senior Centrum Dresden', 'Vitanas GmbH & Co. KGaA', 'privat',
  'Königstraße', '8', '01067', 'Dresden', 'Sachsen',
  51.056300, 13.737800,
  '+49 351 48642100', 'dresden@vitanas.de', 'https://www.vitanas.de',
  150, 12, 1,
  ARRAY['demenz','kurzzeitpflege'], ARRAY['Deutsch','Englisch'],
  180000, 72000, 52000, 45000,
  1.9, 82, 79, '2025-07-22',
  true, false, 'täglich 08:30–20:30',
  '3 Mahlzeiten + Snacks, Wochenspeiseplan, Sonderkostformen möglich',
  ARRAY['musik','gedaechtnistraining','ausfluge','kochen','malen']
),

-- 7. Stuttgart
(
  'Caritas Altenheim Stuttgart', 'Caritasverband Stuttgart e.V.', 'freigemeinnuetzig',
  'Marktplatz', '1', '70173', 'Stuttgart', 'Baden-Württemberg',
  48.778400, 9.179700,
  '+49 711 20630100', 'altenheim@caritas-stuttgart.de', 'https://www.caritas-stuttgart.de',
  80, 4, 3,
  ARRAY['demenz','kurzzeitpflege'], ARRAY['Deutsch','Englisch','Italienisch'],
  240000, 82000, 60000, 54000,
  1.4, 90, 87, '2025-11-30',
  true, true, 'täglich 09:00–19:00',
  '3 Mahlzeiten + Snacks, vegetarisch, halal und koscher möglich',
  ARRAY['gedaechtnistraining','musik','garten','ausfluge','andacht']
),

-- 8. Leipzig
(
  'Pflegezentrum Nord Leipzig', 'Stadt Leipzig – Eigenbetrieb Städtisches Klinikum', 'oeffentlich',
  'Gohliser Straße', '22', '04103', 'Leipzig', 'Sachsen',
  51.359900, 12.369200,
  '+49 341 65432100', 'pflegezentrum-nord@klinikum-leipzig.de', 'https://www.klinikum-leipzig.de',
  170, 20, 6,
  ARRAY['demenz','kurzzeitpflege','beatmung'], ARRAY['Deutsch','Englisch','Russisch','Polnisch'],
  165000, 68000, 50000, 42000,
  2.0, 80, 77, '2025-06-18',
  true, false, 'täglich 08:00–20:00',
  '3 Mahlzeiten + Snacks, vegetarisch möglich, Diabetikerkost verfügbar',
  ARRAY['gedaechtnistraining','musik','ausfluge','malen','tierbesuch']
);

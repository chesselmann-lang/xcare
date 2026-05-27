-- ============================================================
-- F37: Qualitätsbericht-Vergleich §115 SGB XI
-- MDK-Pflegeheim-Qualitätsberichte und Nutzer-Vergleiche
-- ============================================================

-- ── 1. Pflegeheime mit Qualitätsdaten ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pflegeheime (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  traeger               TEXT,
  strasse               TEXT,
  hausnummer            TEXT,
  plz                   TEXT NOT NULL,
  ort                   TEXT NOT NULL,
  bundesland            TEXT,
  lat                   NUMERIC(9,6),
  lng                   NUMERIC(9,6),
  telefon               TEXT,
  email                 TEXT,
  webseite              TEXT,
  plaetze_gesamt        INT,
  plaetze_pflegebeduerft INT,
  heimaufsicht_zertif   BOOLEAN DEFAULT true,
  aktiv                 BOOLEAN NOT NULL DEFAULT true,
  erstellt_am           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pflegeheime_plz_idx ON pflegeheime(plz);
CREATE INDEX IF NOT EXISTS pflegeheime_bundesland_idx ON pflegeheime(bundesland);
ALTER TABLE pflegeheime ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pflegeheime_public_read" ON pflegeheime FOR SELECT USING (aktiv = true);

-- ── 2. Qualitätsberichte (MDK-Prüfungen) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS qualitaetsberichte (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  heim_id               UUID NOT NULL REFERENCES pflegeheime(id) ON DELETE CASCADE,
  pruefung_datum        DATE NOT NULL,
  pruefungsart          TEXT CHECK (pruefungsart IN ('regelmaessig','anlassbezogen','wiederholt')),
  -- Qualitätsbereiche (1-5 Sterne)
  score_pflege          NUMERIC(3,2) CHECK (score_pflege BETWEEN 1 AND 5),
  score_medizin         NUMERIC(3,2) CHECK (score_medizin BETWEEN 1 AND 5),
  score_soziales        NUMERIC(3,2) CHECK (score_soziales BETWEEN 1 AND 5),
  score_unterkunft      NUMERIC(3,2) CHECK (score_unterkunft BETWEEN 1 AND 5),
  score_gesamt          NUMERIC(3,2) CHECK (score_gesamt BETWEEN 1 AND 5),
  maengel_anzahl        INT DEFAULT 0,
  empfehlungen          TEXT[],
  bericht_url           TEXT,
  aktiv                 BOOLEAN NOT NULL DEFAULT true,
  erstellt_am           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qualitaetsberichte_heim_idx ON qualitaetsberichte(heim_id, pruefung_datum DESC);
ALTER TABLE qualitaetsberichte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qualitaetsberichte_public_read" ON qualitaetsberichte FOR SELECT USING (aktiv = true);

-- ── 3. Nutzer-Vergleichslisten ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qualitaets_vergleiche (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL DEFAULT 'Mein Vergleich',
  heim_ids              UUID[] NOT NULL DEFAULT '{}',
  notizen               TEXT,
  erstellt_am           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE qualitaets_vergleiche ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qualitaets_vergleiche_select" ON qualitaets_vergleiche FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "qualitaets_vergleiche_insert" ON qualitaets_vergleiche FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "qualitaets_vergleiche_update" ON qualitaets_vergleiche FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "qualitaets_vergleiche_delete" ON qualitaets_vergleiche FOR DELETE USING (user_id = auth.uid());

-- ── 4. Seed: 8 Pflegeheime mit Qualitätsberichten ─────────────────────────────
INSERT INTO pflegeheime (name, traeger, strasse, hausnummer, plz, ort, bundesland, lat, lng, telefon, plaetze_gesamt, plaetze_pflegebeduerft)
VALUES
  ('Seniorenzentrum am Tiergarten', 'Kursana GmbH', 'Altonaer Straße', '4', '10557', 'Berlin', 'Berlin', 52.5134, 13.3397, '030 39400-0', 120, 98),
  ('AWO Pflegeheim Neuperlach', 'AWO München gGmbH', 'Karl-Marx-Ring', '75', '81735', 'München', 'Bayern', 48.1119, 11.6384, '089 6370-0', 80, 72),
  ('Caritas Altenzentrum St. Josef', 'Caritas München', 'Weltenburger Str.', '18', '81677', 'München', 'Bayern', 48.1353, 11.6102, '089 45232-0', 95, 88),
  ('Diakonie Seniorenheim Hamburg-Nord', 'Diakonie Hamburg', 'Fuhlsbüttler Str.', '460', '22309', 'Hamburg', 'Hamburg', 53.6097, 10.0418, '040 6310-0', 110, 95),
  ('DRK Pflegezentrum Köln-Ehrenfeld', 'DRK Köln', 'Venloer Str.', '200', '50823', 'Köln', 'Nordrhein-Westfalen', 50.9451, 6.9143, '0221 5591-0', 75, 68),
  ('Johanniter Residenz Frankfurt', 'Johanniter GmbH', 'Ginnheimer Str.', '7', '60487', 'Frankfurt am Main', 'Hessen', 50.1254, 8.6419, '069 97508-0', 100, 90),
  ('Pro Seniore Residenz Dresden', 'Pro Seniore AG', 'Tiergartenstr.', '30', '01219', 'Dresden', 'Sachsen', 51.0392, 13.7620, '0351 4702-0', 88, 80),
  ('Vitanas Senioren Centrum Stuttgart', 'Vitanas GmbH', 'Böblinger Str.', '68', '70199', 'Stuttgart', 'Baden-Württemberg', 48.7619, 9.1582, '0711 6478-0', 92, 84)
ON CONFLICT DO NOTHING;

INSERT INTO qualitaetsberichte (heim_id, pruefung_datum, pruefungsart, score_pflege, score_medizin, score_soziales, score_unterkunft, score_gesamt, maengel_anzahl)
SELECT id, '2025-03-15', 'regelmaessig', 4.2, 3.9, 4.5, 4.1, 4.2, 2 FROM pflegeheime WHERE name = 'Seniorenzentrum am Tiergarten'
UNION ALL
SELECT id, '2025-01-20', 'regelmaessig', 3.8, 4.1, 4.0, 3.7, 3.9, 4 FROM pflegeheime WHERE name = 'AWO Pflegeheim Neuperlach'
UNION ALL
SELECT id, '2025-04-08', 'regelmaessig', 4.6, 4.3, 4.7, 4.4, 4.5, 1 FROM pflegeheime WHERE name = 'Caritas Altenzentrum St. Josef'
UNION ALL
SELECT id, '2025-02-11', 'regelmaessig', 4.0, 3.8, 4.2, 4.0, 4.0, 3 FROM pflegeheime WHERE name = 'Diakonie Seniorenheim Hamburg-Nord'
UNION ALL
SELECT id, '2025-05-06', 'regelmaessig', 3.5, 3.6, 3.9, 3.8, 3.7, 6 FROM pflegeheime WHERE name = 'DRK Pflegezentrum Köln-Ehrenfeld'
UNION ALL
SELECT id, '2025-03-28', 'regelmaessig', 4.4, 4.2, 4.6, 4.5, 4.4, 1 FROM pflegeheime WHERE name = 'Johanniter Residenz Frankfurt'
UNION ALL
SELECT id, '2025-01-14', 'regelmaessig', 4.1, 4.0, 4.3, 4.2, 4.2, 2 FROM pflegeheime WHERE name = 'Pro Seniore Residenz Dresden'
UNION ALL
SELECT id, '2025-04-22', 'regelmaessig', 3.9, 3.7, 4.1, 4.0, 3.9, 3 FROM pflegeheime WHERE name = 'Vitanas Senioren Centrum Stuttgart';

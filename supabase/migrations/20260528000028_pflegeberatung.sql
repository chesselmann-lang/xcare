-- ============================================================
-- F34: §7a SGB XI Pflegeberatungsstellen-Suche
-- Pflegeberatungsstellen-Verzeichnis und Terminbuchung
-- ============================================================

-- ── 1. Pflegeberatungsstellen ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pflegeberatungsstellen (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  traeger         TEXT,
  traeger_typ     TEXT        CHECK (traeger_typ IN ('pflegekasse','vdk','sozialverband','kommune','sonstige')),
  strasse         TEXT,
  hausnummer      TEXT,
  plz             TEXT        NOT NULL,
  ort             TEXT        NOT NULL,
  bundesland      TEXT,
  lat             NUMERIC(9,6),
  lng             NUMERIC(9,6),
  telefon         TEXT,
  email           TEXT,
  webseite        TEXT,
  oeffnungszeiten TEXT,
  sprachen        TEXT[]      NOT NULL DEFAULT '{Deutsch}',
  hausbesuche     BOOLEAN     NOT NULL DEFAULT true,
  video_beratung  BOOLEAN     NOT NULL DEFAULT false,
  zertifiziert    BOOLEAN     NOT NULL DEFAULT true,
  aktiv           BOOLEAN     NOT NULL DEFAULT true,
  erstellt_am     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pflegeberatungsstellen_plz_idx
  ON pflegeberatungsstellen (plz);

CREATE INDEX IF NOT EXISTS pflegeberatungsstellen_bundesland_idx
  ON pflegeberatungsstellen (bundesland);

CREATE INDEX IF NOT EXISTS pflegeberatungsstellen_aktiv_idx
  ON pflegeberatungsstellen (aktiv);

ALTER TABLE pflegeberatungsstellen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pflegeberatungsstellen_public_read"
  ON pflegeberatungsstellen FOR SELECT
  USING (aktiv = true);

-- ── 2. Beratungs-Termine ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS beratung_termine (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stelle_id       UUID        NOT NULL REFERENCES pflegeberatungsstellen(id) ON DELETE CASCADE,
  wunschtermin    DATE        NOT NULL,
  wunschuhrzeit   TEXT,
  beratungsgrund  TEXT,
  kontaktart      TEXT        NOT NULL DEFAULT 'praesenz'
                  CHECK (kontaktart IN ('telefon','video','hausbesuch','praesenz')),
  status          TEXT        NOT NULL DEFAULT 'angefragt'
                  CHECK (status IN ('angefragt','bestaetigt','abgesagt','erledigt')),
  notizen         TEXT,
  erstellt_am     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS beratung_termine_user_idx
  ON beratung_termine (user_id, wunschtermin DESC);

CREATE INDEX IF NOT EXISTS beratung_termine_status_idx
  ON beratung_termine (user_id, status);

ALTER TABLE beratung_termine ENABLE ROW LEVEL SECURITY;

CREATE POLICY "beratung_termine_owner_select"
  ON beratung_termine FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "beratung_termine_owner_insert"
  ON beratung_termine FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "beratung_termine_owner_update"
  ON beratung_termine FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "beratung_termine_owner_delete"
  ON beratung_termine FOR DELETE
  USING (user_id = auth.uid());

-- ── 3. Seed-Daten: 10 Pflegeberatungsstellen ─────────────────────────────────

INSERT INTO pflegeberatungsstellen
  (name, traeger, traeger_typ, strasse, hausnummer, plz, ort, bundesland,
   lat, lng, telefon, email, webseite, oeffnungszeiten,
   sprachen, hausbesuche, video_beratung, zertifiziert, aktiv)
VALUES

  -- 1. AOK-Pflegeberatung Berlin
  (
    'AOK-Pflegeberatung Berlin Mitte',
    'AOK Nordost – Die Gesundheitskasse',
    'pflegekasse',
    'Wilhelmstraße',
    '1',
    '10963',
    'Berlin',
    'Berlin',
    52.505400,
    13.381800,
    '030 34693-0',
    'pflegeberatung.berlin@nordost.aok.de',
    'https://www.aok.de/pk/nordost/inhalt/pflegeberatung/',
    'Mo–Fr 09:00–17:00 Uhr, Di bis 18:00 Uhr',
    ARRAY['Deutsch','Türkisch','Arabisch'],
    true,
    true,
    true,
    true
  ),

  -- 2. AOK-Pflegeberatung Hamburg
  (
    'AOK-Pflegeberatung Hamburg Altona',
    'AOK Rheinland/Hamburg – Die Gesundheitskasse',
    'pflegekasse',
    'Große Bergstraße',
    '24',
    '22767',
    'Hamburg',
    'Hamburg',
    53.549700,
    9.937200,
    '040 25637-0',
    'pflegeberatung.hh@rh.aok.de',
    'https://www.aok.de/pk/rheinland-hamburg/inhalt/pflegeberatung/',
    'Mo–Do 08:30–17:00 Uhr, Fr 08:30–14:30 Uhr',
    ARRAY['Deutsch','Englisch'],
    true,
    true,
    true,
    true
  ),

  -- 3. VdK Pflegeberatung München
  (
    'VdK-Sozialrechtsberatung München',
    'Sozialverband VdK Bayern e.V.',
    'vdk',
    'Schellingstraße',
    '31',
    '80799',
    'München',
    'Bayern',
    48.151400,
    11.573200,
    '089 2117-218',
    'muenchen-stadt@vdk.de',
    'https://www.vdk.de/kreisverband-muenchen-stadt/',
    'Mo, Mi, Fr 09:00–12:00 Uhr; Di 14:00–17:00 Uhr; Termine nach Vereinbarung',
    ARRAY['Deutsch'],
    true,
    false,
    true,
    true
  ),

  -- 4. VdK Pflegeberatung Köln
  (
    'VdK-Pflegeberatung Köln-Innenstadt',
    'Sozialverband VdK Rheinland-Pfalz/Saarland e.V.',
    'vdk',
    'Aachener Straße',
    '8',
    '50674',
    'Köln',
    'Nordrhein-Westfalen',
    50.934300,
    6.929800,
    '0221 92054-0',
    'pflegeberatung.koeln@vdk.de',
    'https://www.vdk.de/kreisverband-koeln/',
    'Mo–Do 09:00–16:00 Uhr, Fr 09:00–13:00 Uhr',
    ARRAY['Deutsch','Englisch'],
    true,
    true,
    true,
    true
  ),

  -- 5. Verband Sozialer Arbeit Frankfurt
  (
    'AWO Pflegeberatungsstelle Frankfurt am Main',
    'Arbeiterwohlfahrt Kreisverband Frankfurt am Main e.V.',
    'sozialverband',
    'Henschelstraße',
    '11',
    '60314',
    'Frankfurt am Main',
    'Hessen',
    50.109200,
    8.706500,
    '069 298901-0',
    'pflegeberatung@awo-frankfurt.de',
    'https://www.awo-frankfurt.de/pflege/pflegeberatung/',
    'Mo–Fr 08:00–18:00 Uhr, Hausbesuche nach Vereinbarung',
    ARRAY['Deutsch','Türkisch'],
    true,
    true,
    true,
    true
  ),

  -- 6. Verband Sozialer Arbeit Stuttgart
  (
    'AWO Pflegeberatung Stuttgart-Mitte',
    'Arbeiterwohlfahrt Bezirksverband Württemberg e.V.',
    'sozialverband',
    'Johannesstraße',
    '46',
    '70176',
    'Stuttgart',
    'Baden-Württemberg',
    48.776100,
    9.168900,
    '0711 61926-0',
    'pflegeberatung@awo-wuerttemberg.de',
    'https://www.awo-wuerttemberg.de/pflege/',
    'Mo–Do 09:00–17:00 Uhr, Fr 09:00–14:00 Uhr',
    ARRAY['Deutsch','Russisch'],
    true,
    false,
    true,
    true
  ),

  -- 7. Kommunale Pflegeberatung Dresden
  (
    'Kommunale Pflegeberatung Dresden',
    'Landeshauptstadt Dresden – Sozialamt',
    'kommune',
    'Grunaer Straße',
    '2',
    '01069',
    'Dresden',
    'Sachsen',
    51.041200,
    13.744300,
    '0351 4883700',
    'pflegeberatung@dresden.de',
    'https://www.dresden.de/de/leben/gesundheit/pflege/pflegeberatung.php',
    'Mo, Di, Do 09:00–18:00 Uhr; Mi, Fr 09:00–13:00 Uhr',
    ARRAY['Deutsch'],
    true,
    true,
    true,
    true
  ),

  -- 8. Kommunale Pflegeberatung Leipzig
  (
    'Kommunale Pflegestützpunkt Leipzig',
    'Stadt Leipzig – Amt für Soziales',
    'kommune',
    'Prager Straße',
    '118-136',
    '04317',
    'Leipzig',
    'Sachsen',
    51.326400,
    12.405100,
    '0341 1234560',
    'pflegestuetzpunkt@leipzig.de',
    'https://www.leipzig.de/buergerservice-und-verwaltung/aemter-und-behoerden/amt-fuer-soziales/',
    'Mo–Fr 09:00–16:00 Uhr; Do bis 18:00 Uhr',
    ARRAY['Deutsch','Englisch'],
    true,
    false,
    true,
    true
  ),

  -- 9. Caritas Düsseldorf
  (
    'Caritas Pflegeberatung Düsseldorf',
    'Caritasverband für das Erzbistum Köln e.V.',
    'sonstige',
    'Hubertusstraße',
    '5',
    '40219',
    'Düsseldorf',
    'Nordrhein-Westfalen',
    51.213900,
    6.757200,
    '0211 16092-0',
    'pflegeberatung@caritas-duesseldorf.de',
    'https://www.caritas-duesseldorf.de/pflege/pflegeberatung/',
    'Mo–Fr 09:00–17:00 Uhr; Hausbesuche Di und Do',
    ARRAY['Deutsch','Polnisch'],
    true,
    true,
    true,
    true
  ),

  -- 10. Diakonie Bremen
  (
    'Diakonisches Werk Bremen – Pflegeberatung',
    'Diakonisches Werk Bremen e.V.',
    'sonstige',
    'Contrescarpe',
    '101',
    '28195',
    'Bremen',
    'Bremen',
    53.072600,
    8.803700,
    '0421 160410',
    'pflegeberatung@diakonie-bremen.de',
    'https://www.diakonie-bremen.de/hilfe-angebote/pflege/pflegeberatung/',
    'Mo–Fr 08:30–12:30 Uhr; Mo und Mi 14:00–17:00 Uhr; Hausbesuche nach Absprache',
    ARRAY['Deutsch','Russisch','Englisch'],
    true,
    true,
    true,
    true
  )

ON CONFLICT DO NOTHING;

-- ============================================================
-- F32: Telemedizin-Hub & Arzt-Koordination
-- Video consultation providers, user appointments, and
-- doctor coordination registry
-- ============================================================

-- ── 1. Telemedizin-Anbieter ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS telemedizin_anbieter (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT        NOT NULL,
  slug                    TEXT        NOT NULL UNIQUE,
  beschreibung            TEXT,
  fachgebiete             TEXT[]      NOT NULL DEFAULT '{}',
  sprachen                TEXT[]      NOT NULL DEFAULT '{Deutsch}',
  verfuegbar_ab           TIME        NOT NULL DEFAULT '08:00',
  verfuegbar_bis          TIME        NOT NULL DEFAULT '18:00',
  preis_pro_sitzung_cent  INT         NOT NULL DEFAULT 0 CHECK (preis_pro_sitzung_cent >= 0),
  versicherung_direkt     BOOLEAN     NOT NULL DEFAULT false,
  bewertung_schnitt       NUMERIC(3,2)         DEFAULT NULL,
  anzahl_bewertungen      INT         NOT NULL DEFAULT 0,
  bild_url                TEXT,
  verified                BOOLEAN     NOT NULL DEFAULT false,
  aktiv                   BOOLEAN     NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS telemedizin_anbieter_fachgebiete_idx
  ON telemedizin_anbieter USING GIN (fachgebiete);

CREATE INDEX IF NOT EXISTS telemedizin_anbieter_aktiv_verified_idx
  ON telemedizin_anbieter (aktiv, verified);

ALTER TABLE telemedizin_anbieter ENABLE ROW LEVEL SECURITY;

-- Public read for verified active providers
CREATE POLICY "telemedizin_anbieter_public_read"
  ON telemedizin_anbieter FOR SELECT
  USING (verified = true AND aktiv = true);

-- ── 2. Telemedizin-Termine ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS telemedizin_termine (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anbieter_id     UUID        NOT NULL REFERENCES telemedizin_anbieter(id) ON DELETE CASCADE,
  termin_datum    DATE        NOT NULL,
  termin_uhrzeit  TIME        NOT NULL,
  dauer_minuten   INT         NOT NULL DEFAULT 30 CHECK (dauer_minuten > 0),
  grund           TEXT,
  status          TEXT        NOT NULL DEFAULT 'geplant'
                  CHECK (status IN ('geplant','bestaetigt','laufend','abgeschlossen','storniert')),
  video_link      TEXT,
  notizen         TEXT,
  arztbrief_url   TEXT,
  erstellt_am     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS telemedizin_termine_user_datum_idx
  ON telemedizin_termine (user_id, termin_datum DESC);

CREATE INDEX IF NOT EXISTS telemedizin_termine_status_idx
  ON telemedizin_termine (user_id, status);

ALTER TABLE telemedizin_termine ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telemedizin_termine_owner_select"
  ON telemedizin_termine FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "telemedizin_termine_owner_insert"
  ON telemedizin_termine FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "telemedizin_termine_owner_update"
  ON telemedizin_termine FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "telemedizin_termine_owner_delete"
  ON telemedizin_termine FOR DELETE
  USING (user_id = auth.uid());

-- ── 3. Arzt-Koordination ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS arzt_koordination (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  arzt_name               TEXT        NOT NULL,
  arzt_fachrichtung       TEXT,
  praxis_name             TEXT,
  praxis_telefon          TEXT,
  praxis_adresse          TEXT,
  naechster_termin        DATE,
  letzte_behandlung       DATE,
  chronische_diagnosen    TEXT[]      NOT NULL DEFAULT '{}',
  aktuelle_medikamente    TEXT[]      NOT NULL DEFAULT '{}',
  befunde_dokumente       TEXT[]      NOT NULL DEFAULT '{}',
  notizen                 TEXT,
  erstellt_am             TIMESTAMPTZ NOT NULL DEFAULT now(),
  aktualisiert_am         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS arzt_koordination_user_idx
  ON arzt_koordination (user_id);

CREATE INDEX IF NOT EXISTS arzt_koordination_naechster_termin_idx
  ON arzt_koordination (user_id, naechster_termin);

ALTER TABLE arzt_koordination ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arzt_koordination_owner_select"
  ON arzt_koordination FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "arzt_koordination_owner_insert"
  ON arzt_koordination FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "arzt_koordination_owner_update"
  ON arzt_koordination FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "arzt_koordination_owner_delete"
  ON arzt_koordination FOR DELETE
  USING (user_id = auth.uid());

-- ── 4. Seed-Daten: Telemedizin-Anbieter ──────────────────────────────────────

INSERT INTO telemedizin_anbieter
  (name, slug, beschreibung, fachgebiete, sprachen, verfuegbar_ab, verfuegbar_bis,
   preis_pro_sitzung_cent, versicherung_direkt, bewertung_schnitt, anzahl_bewertungen,
   verified, aktiv)
VALUES
  (
    'TeleDoc Deutschland',
    'teledoc-deutschland',
    'Schnelle Online-Konsultation bei Allgemeinmedizin und Innerer Medizin. Rezepte und Überweisungen digital. Kassenärztlich zugelassen.',
    ARRAY['Allgemeinmedizin','Innere Medizin'],
    ARRAY['Deutsch','Englisch'],
    '08:00', '20:00',
    2900,
    true,
    4.6,
    312,
    true,
    true
  ),
  (
    'Online-Arzt Plus',
    'online-arzt-plus',
    'Spezialisiert auf psychische Gesundheit. Vertrauliche Videogespräche mit erfahrenen Psychiatern und Psychotherapeuten.',
    ARRAY['Psychiatrie','Psychotherapie'],
    ARRAY['Deutsch'],
    '09:00', '19:00',
    7900,
    false,
    4.8,
    187,
    true,
    true
  ),
  (
    'PflegeConsult Digital',
    'pflegeconsult-digital',
    'Beratung bei Pflegebedürftigkeit durch spezialisierte Pflegemediziner und Geriater. Ideal für ältere Patienten und Angehörige.',
    ARRAY['Pflegemedizin','Geriatrie'],
    ARRAY['Deutsch','Türkisch'],
    '08:00', '17:00',
    4900,
    true,
    4.7,
    94,
    true,
    true
  )
ON CONFLICT (slug) DO NOTHING;

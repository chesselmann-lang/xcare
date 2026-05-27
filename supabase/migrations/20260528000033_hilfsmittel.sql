-- ============================================================
-- F39: Hilfsmittel-Ausleihe-Börse §40 SGB XI
-- ============================================================

-- ── 1. Hilfsmittel-Kategorien (Stammdaten) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS hilfsmittel_kategorien (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name     TEXT NOT NULL UNIQUE,
  icon     TEXT,
  aktiv    BOOLEAN DEFAULT true
);

ALTER TABLE hilfsmittel_kategorien ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hilfsmittel_kategorien_public_read" ON hilfsmittel_kategorien FOR SELECT USING (aktiv = true);

INSERT INTO hilfsmittel_kategorien (name, icon) VALUES
  ('Rollstuhl', '🦽'), ('Rollator', '🚶'), ('Pflegebett', '🛏️'),
  ('Badehilfe', '🛁'), ('Toilettenstuhl', '🪑'), ('Gehhilfe / Krücken', '🩼'),
  ('Hebehilfe / Lifter', '🏋️'), ('Inhalationsgerät', '💨'), ('Sonstiges', '📦')
ON CONFLICT (name) DO NOTHING;

-- ── 2. Hilfsmittel-Bedarf (was der Nutzer braucht) ────────────────────────────
CREATE TABLE IF NOT EXISTS hilfsmittel_bedarf (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  kategorie_id    UUID REFERENCES hilfsmittel_kategorien(id),
  beschreibung    TEXT NOT NULL,
  plz             TEXT NOT NULL,
  ort             TEXT NOT NULL,
  benoetigte_von  DATE,
  benoetigte_bis  DATE,
  leihzeitraum    TEXT CHECK (leihzeitraum IN ('kurzzeit','mittel','langzeit','unbefristet')),
  kassenantrag    BOOLEAN DEFAULT false,
  kontakt_email   TEXT,
  kontakt_telefon TEXT,
  status          TEXT DEFAULT 'offen' CHECK (status IN ('offen','vergeben','abgelaufen','geloescht')),
  erstellt_am     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hilfsmittel_bedarf_plz_idx ON hilfsmittel_bedarf(plz);
CREATE INDEX IF NOT EXISTS hilfsmittel_bedarf_status_idx ON hilfsmittel_bedarf(status);
ALTER TABLE hilfsmittel_bedarf ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hilfsmittel_bedarf_public_read" ON hilfsmittel_bedarf FOR SELECT USING (status = 'offen');
CREATE POLICY "hilfsmittel_bedarf_owner_insert" ON hilfsmittel_bedarf FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "hilfsmittel_bedarf_owner_update" ON hilfsmittel_bedarf FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- ── 3. Hilfsmittel-Angebote (was der Nutzer verleihen kann) ───────────────────
CREATE TABLE IF NOT EXISTS hilfsmittel_angebote (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  kategorie_id    UUID REFERENCES hilfsmittel_kategorien(id),
  beschreibung    TEXT NOT NULL,
  zustand         TEXT DEFAULT 'gut' CHECK (zustand IN ('neuwertig','gut','gebraucht')),
  plz             TEXT NOT NULL,
  ort             TEXT NOT NULL,
  verfuegbar_ab   DATE,
  verfuegbar_bis  DATE,
  preis_art       TEXT DEFAULT 'kostenlos' CHECK (preis_art IN ('kostenlos','spende','miete')),
  preis_monat_cent INT DEFAULT 0,
  fotos           TEXT[] DEFAULT '{}',
  kontakt_email   TEXT,
  kontakt_telefon TEXT,
  status          TEXT DEFAULT 'aktiv' CHECK (status IN ('aktiv','verliehen','abgelaufen','geloescht')),
  erstellt_am     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hilfsmittel_angebote_plz_idx ON hilfsmittel_angebote(plz);
CREATE INDEX IF NOT EXISTS hilfsmittel_angebote_status_idx ON hilfsmittel_angebote(status, kategorie_id);
ALTER TABLE hilfsmittel_angebote ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hilfsmittel_angebote_public_read" ON hilfsmittel_angebote FOR SELECT USING (status = 'aktiv');
CREATE POLICY "hilfsmittel_angebote_owner_insert" ON hilfsmittel_angebote FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "hilfsmittel_angebote_owner_update" ON hilfsmittel_angebote FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- ── 4. Seed: Beispiel-Angebote ─────────────────────────────────────────────────
INSERT INTO hilfsmittel_angebote (user_id, kategorie_id, beschreibung, zustand, plz, ort, preis_art, kontakt_telefon, status)
SELECT
  (SELECT id FROM auth.users LIMIT 1),
  k.id,
  beschreibung,
  zustand,
  plz, ort, preis_art, telefon, 'aktiv'
FROM (VALUES
  ('Rollstuhl', 'Leichter Faltrollstuhl, kaum benutzt, mit Fußrasten und Armlehnen', 'gut', '80331', 'München', 'kostenlos', '089-XXXXXXX'),
  ('Rollator', 'Aluminium-Rollator mit Sitzmöglichkeit, 4-Rad, guter Zustand', 'gut', '10115', 'Berlin', 'kostenlos', '030-XXXXXXX'),
  ('Pflegebett', 'Elektrisch höhenverstellbares Pflegebett mit Seitengitter', 'neuwertig', '20095', 'Hamburg', 'miete', '040-XXXXXXX'),
  ('Badehilfe', 'Badewannenlifter, elektrisch, Tragkraft 130 kg', 'gut', '50667', 'Köln', 'spende', '0221-XXXXXXX')
) AS v(kat_name, beschreibung, zustand, plz, ort, preis_art, telefon)
JOIN hilfsmittel_kategorien k ON k.name = v.kat_name
WHERE EXISTS (SELECT 1 FROM auth.users)
ON CONFLICT DO NOTHING;

-- ============================================
-- Migration: Pflegeplan (Phase 3A)
-- Pflegeziele, Aufgaben, Termine, Notfallkontakte,
-- Pflegetagebuch, Kostenerfassung
-- Stand: 2026-05-11
-- ============================================

-- 1. Pflegeziele
CREATE TABLE IF NOT EXISTS pflegeziele (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id   uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  titel       text NOT NULL,
  beschreibung text,
  kategorie   text NOT NULL DEFAULT 'allgemein',
  prioritaet  int NOT NULL DEFAULT 2 CHECK (prioritaet BETWEEN 1 AND 3),
  erreicht    boolean NOT NULL DEFAULT false,
  ziel_datum  date,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE pflegeziele ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pflegeziele_owner" ON pflegeziele
  FOR ALL USING (profil_id = auth.uid());

CREATE INDEX IF NOT EXISTS pflegeziele_profil_id_idx ON pflegeziele(profil_id);
CREATE INDEX IF NOT EXISTS pflegeziele_prioritaet_idx ON pflegeziele(profil_id, prioritaet);

-- 2. Pflegeaufgaben
CREATE TABLE IF NOT EXISTS pflegeaufgaben (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id     uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  ziel_id       uuid REFERENCES pflegeziele(id) ON DELETE SET NULL,
  titel         text NOT NULL,
  beschreibung  text,
  haeufigkeit   text NOT NULL DEFAULT 'taeglich'
                  CHECK (haeufigkeit IN ('taeglich', 'woechentlich', 'monatlich', 'bei_bedarf')),
  uhrzeit       text,
  verantwortlich text,
  erledigt_heute boolean NOT NULL DEFAULT false,
  aktiv         boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE pflegeaufgaben ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pflegeaufgaben_owner" ON pflegeaufgaben
  FOR ALL USING (profil_id = auth.uid());

CREATE INDEX IF NOT EXISTS pflegeaufgaben_profil_id_idx ON pflegeaufgaben(profil_id);
CREATE INDEX IF NOT EXISTS pflegeaufgaben_aktiv_idx ON pflegeaufgaben(profil_id, aktiv);

-- 3. Pflegetermine
CREATE TABLE IF NOT EXISTS pflegetermine (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id       uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  titel           text NOT NULL,
  beschreibung    text,
  termin_typ      text NOT NULL DEFAULT 'sonstiges'
                    CHECK (termin_typ IN ('arzt', 'therapie', 'behoerde', 'pflege', 'sonstiges')),
  datum           timestamptz NOT NULL,
  dauer_minuten   int DEFAULT 60,
  ort             text,
  anbieter_id     uuid,
  erinnerung_tage int DEFAULT 1,
  erledigt        boolean NOT NULL DEFAULT false,
  notizen         text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE pflegetermine ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pflegetermine_owner" ON pflegetermine
  FOR ALL USING (profil_id = auth.uid());

CREATE INDEX IF NOT EXISTS pflegetermine_profil_id_idx ON pflegetermine(profil_id);
CREATE INDEX IF NOT EXISTS pflegetermine_datum_idx ON pflegetermine(profil_id, datum);

-- 4. Notfallkontakte
CREATE TABLE IF NOT EXISTS notfallkontakte (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id       uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  name            text NOT NULL,
  beziehung       text,
  telefon         text NOT NULL,
  email           text,
  adresse         text,
  ist_hauptkontakt boolean NOT NULL DEFAULT false,
  sortierung      int NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE notfallkontakte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notfallkontakte_owner" ON notfallkontakte
  FOR ALL USING (profil_id = auth.uid());

CREATE INDEX IF NOT EXISTS notfallkontakte_profil_id_idx ON notfallkontakte(profil_id);
CREATE INDEX IF NOT EXISTS notfallkontakte_sortierung_idx ON notfallkontakte(profil_id, sortierung);

-- 5. Pflegetagebuch
CREATE TABLE IF NOT EXISTS pflegetagebuch (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id     uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  eintrag_datum date NOT NULL DEFAULT CURRENT_DATE,
  stimmung      int CHECK (stimmung BETWEEN 1 AND 5),
  schlaf_stunden numeric(4,1),
  schmerzen     int CHECK (schmerzen BETWEEN 0 AND 10),
  aktivitaeten  text,
  notizen       text,
  erstellt_von  text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE pflegetagebuch ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pflegetagebuch_owner" ON pflegetagebuch
  FOR ALL USING (profil_id = auth.uid());

CREATE INDEX IF NOT EXISTS pflegetagebuch_profil_id_idx ON pflegetagebuch(profil_id);
CREATE INDEX IF NOT EXISTS pflegetagebuch_datum_idx ON pflegetagebuch(profil_id, eintrag_datum DESC);

-- 6. Pflegekosten
CREATE TABLE IF NOT EXISTS pflegekosten (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id     uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  buchungsdatum date NOT NULL DEFAULT CURRENT_DATE,
  betrag        numeric(10,2) NOT NULL,
  kategorie     text NOT NULL DEFAULT 'sonstiges'
                  CHECK (kategorie IN (
                    'pflegehilfsmittel', 'medikamente', 'arzt', 'therapie',
                    'haushaltshilfe', 'fahrtkosten', 'unterkunft', 'sonstiges'
                  )),
  beschreibung  text NOT NULL,
  belegnummer   text,
  erstattung    numeric(10,2) DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE pflegekosten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pflegekosten_owner" ON pflegekosten
  FOR ALL USING (profil_id = auth.uid());

CREATE INDEX IF NOT EXISTS pflegekosten_profil_id_idx ON pflegekosten(profil_id);
CREATE INDEX IF NOT EXISTS pflegekosten_datum_idx ON pflegekosten(profil_id, buchungsdatum DESC);

-- ============================================================
-- Phase 7A-7D: Übergabeprotokoll, Wohlbefinden, NBI, Notfall
-- ============================================================

-- ---------------------------------------------------------
-- 7A: Schicht-Übergabeprotokoll
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS uebergabeprotokolle (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id         uuid NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  schicht_von_id      uuid REFERENCES schichten(id) ON DELETE SET NULL,
  schicht_bis_id      uuid REFERENCES schichten(id) ON DELETE SET NULL,
  care_worker_von     uuid REFERENCES care_workers(id) ON DELETE SET NULL,
  care_worker_bis     uuid REFERENCES care_workers(id) ON DELETE SET NULL,
  familie_profile_id  uuid REFERENCES profiles(id) ON DELETE CASCADE,
  -- Inhalt
  allgemeinzustand    text,
  besonderheiten      text,
  offene_aufgaben     text,
  medikamente_status  text,
  vitalwerte_auffaellig boolean DEFAULT false,
  stimmung            text CHECK (stimmung IN ('gut','mittel','schlecht','unruhig')),
  -- Bestätigung durch übernehmende Kraft
  bestaetigt          boolean DEFAULT false,
  bestaetigt_am       timestamptz,
  erstellt_am         timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON uebergabeprotokolle (anbieter_id, erstellt_am DESC);
CREATE INDEX ON uebergabeprotokolle (familie_profile_id, erstellt_am DESC);
CREATE INDEX ON uebergabeprotokolle (care_worker_bis, bestaetigt);

ALTER TABLE uebergabeprotokolle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_manage_uebergabe"
  ON uebergabeprotokolle FOR ALL
  USING (anbieter_id IN (
    SELECT a.id FROM anbieter a JOIN profiles p ON p.id = a.profile_id WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "familie_read_uebergabe"
  ON uebergabeprotokolle FOR SELECT
  USING (familie_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "admin_uebergabe"
  ON uebergabeprotokolle FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------
-- 7B: Wohlbefindens-Tracker
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS wohlbefinden (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familie_profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  anbieter_id         uuid REFERENCES anbieter(id) ON DELETE SET NULL,
  erfasst_am          date NOT NULL DEFAULT CURRENT_DATE,
  -- Ratings 1 (schlecht) – 5 (sehr gut)
  schlaf              int CHECK (schlaf BETWEEN 1 AND 5),
  schmerz             int CHECK (schmerz BETWEEN 1 AND 5),   -- 1=stark, 5=kein
  stimmung            int CHECK (stimmung BETWEEN 1 AND 5),
  mobilitaet          int CHECK (mobilitaet BETWEEN 1 AND 5),
  appetit             int CHECK (appetit BETWEEN 1 AND 5),
  -- Freitext
  notiz               text,
  -- Erfasst durch
  erfasst_von_rolle   text CHECK (erfasst_von_rolle IN ('familie','anbieter','selbst')),
  erstellt_von        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (familie_profile_id, erfasst_am)  -- nur einmal pro Tag
);

CREATE INDEX ON wohlbefinden (familie_profile_id, erfasst_am DESC);
CREATE INDEX ON wohlbefinden (anbieter_id, erfasst_am DESC);

ALTER TABLE wohlbefinden ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_manage_wohlbefinden"
  ON wohlbefinden FOR ALL
  USING (anbieter_id IN (
    SELECT a.id FROM anbieter a JOIN profiles p ON p.id = a.profile_id WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "familie_manage_wohlbefinden"
  ON wohlbefinden FOR ALL
  USING (familie_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "admin_wohlbefinden"
  ON wohlbefinden FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Wohlbefinden Verlauf View
CREATE OR REPLACE VIEW wohlbefinden_verlauf AS
SELECT
  familie_profile_id,
  DATE_TRUNC('week', erfasst_am::timestamptz) AS woche,
  ROUND(AVG(schlaf)::numeric, 1)     AS avg_schlaf,
  ROUND(AVG(schmerz)::numeric, 1)    AS avg_schmerz,
  ROUND(AVG(stimmung)::numeric, 1)   AS avg_stimmung,
  ROUND(AVG(mobilitaet)::numeric, 1) AS avg_mobilitaet,
  ROUND(AVG(appetit)::numeric, 1)    AS avg_appetit,
  COUNT(*)                           AS anzahl_eintraege
FROM wohlbefinden
GROUP BY familie_profile_id, DATE_TRUNC('week', erfasst_am::timestamptz)
ORDER BY woche DESC;

-- ---------------------------------------------------------
-- 7C: Pflegegrad-Einschätzung (Neues Begutachtungs-Instrument)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS pflegegrad_einschaetzungen (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familie_profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  anbieter_id         uuid REFERENCES anbieter(id) ON DELETE SET NULL,
  einschaetzung_datum date NOT NULL DEFAULT CURRENT_DATE,
  -- NBI Modul 1: Mobilität (max 10 Pkt → Gewicht 10%)
  m1_bettpositionswechsel   int CHECK (m1_bettpositionswechsel BETWEEN 0 AND 3),
  m1_halten_sitzposition    int CHECK (m1_halten_sitzposition BETWEEN 0 AND 3),
  m1_umsetzen               int CHECK (m1_umsetzen BETWEEN 0 AND 3),
  m1_fortbewegung_innen     int CHECK (m1_fortbewegung_innen BETWEEN 0 AND 3),
  m1_treppensteigen         int CHECK (m1_treppensteigen BETWEEN 0 AND 3),
  -- NBI Modul 2: Kognitive Fähigkeiten (max 15 Pkt → Gewicht 15%)
  m2_personen_erkennen      int CHECK (m2_personen_erkennen BETWEEN 0 AND 3),
  m2_oertliche_orientierung int CHECK (m2_oertliche_orientierung BETWEEN 0 AND 3),
  m2_zeitliche_orientierung int CHECK (m2_zeitliche_orientierung BETWEEN 0 AND 3),
  m2_alltagsgegenstaende    int CHECK (m2_alltagsgegenstaende BETWEEN 0 AND 3),
  m2_risiken_erkennen       int CHECK (m2_risiken_erkennen BETWEEN 0 AND 3),
  -- NBI Modul 3: Verhaltensweisen (0=nie → 3=tägl mehrmals)
  m3_motorische_unruhe      int CHECK (m3_motorische_unruhe BETWEEN 0 AND 3),
  m3_naechtliche_unruhe     int CHECK (m3_naechtliche_unruhe BETWEEN 0 AND 3),
  m3_abwehrverhalten        int CHECK (m3_abwehrverhalten BETWEEN 0 AND 3),
  -- NBI Modul 4: Selbstversorgung (max 42 Pkt → Gewicht 40%)
  m4_waschen_gesicht        int CHECK (m4_waschen_gesicht BETWEEN 0 AND 3),
  m4_koerperpflege          int CHECK (m4_koerperpflege BETWEEN 0 AND 3),
  m4_an_auskleiden          int CHECK (m4_an_auskleiden BETWEEN 0 AND 3),
  m4_ernaehrung             int CHECK (m4_ernaehrung BETWEEN 0 AND 3),
  m4_trinken                int CHECK (m4_trinken BETWEEN 0 AND 3),
  m4_toilettennutzung       int CHECK (m4_toilettennutzung BETWEEN 0 AND 3),
  -- NBI Modul 5: Umgang mit Erkrankungen (max 27 Pkt → Gewicht 20%)
  m5_medikamente            int CHECK (m5_medikamente BETWEEN 0 AND 3),
  m5_arztbesuche            int CHECK (m5_arztbesuche BETWEEN 0 AND 3),
  m5_hilfsmittel            int CHECK (m5_hilfsmittel BETWEEN 0 AND 3),
  -- NBI Modul 6: Alltagsleben (max 18 Pkt → Gewicht 15%)
  m6_tagesstruktur          int CHECK (m6_tagesstruktur BETWEEN 0 AND 3),
  m6_freizeitgestaltung     int CHECK (m6_freizeitgestaltung BETWEEN 0 AND 3),
  m6_kontakte               int CHECK (m6_kontakte BETWEEN 0 AND 3),
  -- Ergebnis
  gesamtpunkte              numeric(5,2),
  pflegegrad_empfehlung     int CHECK (pflegegrad_empfehlung BETWEEN 1 AND 5),
  aktueller_pflegegrad      int CHECK (aktueller_pflegegrad BETWEEN 0 AND 5),
  notizen                   text,
  erstellt_von              uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON pflegegrad_einschaetzungen (familie_profile_id, einschaetzung_datum DESC);

ALTER TABLE pflegegrad_einschaetzungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_manage_pflegegrad"
  ON pflegegrad_einschaetzungen FOR ALL
  USING (anbieter_id IN (
    SELECT a.id FROM anbieter a JOIN profiles p ON p.id = a.profile_id WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "familie_read_pflegegrad"
  ON pflegegrad_einschaetzungen FOR SELECT
  USING (familie_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "admin_pflegegrad"
  ON pflegegrad_einschaetzungen FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------
-- 7D: Notfall-Management
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS notfallplaene (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familie_profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  anbieter_id         uuid REFERENCES anbieter(id) ON DELETE SET NULL,
  -- Medizinische Basisinfos
  blutgruppe          text,
  allergien           text,
  chronische_erkrankungen text,
  implantate          text,           -- Herzschrittmacher etc.
  dnr_verfuegung      boolean DEFAULT false,  -- Do Not Resuscitate
  patientenverfuegung_vorhanden boolean DEFAULT false,
  -- Notfallhinweise
  besondere_hinweise  text,
  medikamente_notfall text,           -- Kritische Medikamente die Sanitäter wissen müssen
  -- Krankenhaus-Präferenz
  krankenhaus_name    text,
  krankenhaus_adresse text,
  -- Hausarzt
  hausarzt_name       text,
  hausarzt_telefon    text,
  -- Krankenkasse
  krankenkasse        text,
  versicherungsnummer text,
  aktiv               boolean NOT NULL DEFAULT true,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ON notfallplaene (familie_profile_id) WHERE aktiv = true;

ALTER TABLE notfallplaene ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_manage_notfallplan"
  ON notfallplaene FOR ALL
  USING (anbieter_id IN (
    SELECT a.id FROM anbieter a JOIN profiles p ON p.id = a.profile_id WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "familie_manage_notfallplan"
  ON notfallplaene FOR ALL
  USING (familie_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "admin_notfallplan"
  ON notfallplaene FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS notfallkontakte (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familie_profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  anbieter_id         uuid REFERENCES anbieter(id) ON DELETE SET NULL,
  name                text NOT NULL,
  beziehung           text NOT NULL,   -- Tochter, Sohn, Arzt, etc.
  telefon_1           text NOT NULL,
  telefon_2           text,
  email               text,
  erreichbar_von      text,            -- "Mo-Fr 9-17 Uhr"
  prioritaet          int NOT NULL DEFAULT 1 CHECK (prioritaet BETWEEN 1 AND 10),
  ist_bevollmaechtigt boolean DEFAULT false,
  notizen             text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON notfallkontakte (familie_profile_id, prioritaet);

ALTER TABLE notfallkontakte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_manage_notfallkontakte"
  ON notfallkontakte FOR ALL
  USING (anbieter_id IN (
    SELECT a.id FROM anbieter a JOIN profiles p ON p.id = a.profile_id WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "familie_manage_notfallkontakte"
  ON notfallkontakte FOR ALL
  USING (familie_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "admin_notfallkontakte"
  ON notfallkontakte FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE TRIGGER notfallplan_updated_at
  BEFORE UPDATE ON notfallplaene
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------
-- 8A: Medikamentenplan-Erweiterungen (zeiten[] display helper)
-- ---------------------------------------------------------
-- (medikamenten_plan table already exists from migration 11)

-- 8C: Care-Worker Kompetenz-Portfolio
CREATE TABLE IF NOT EXISTS care_worker_zertifikate (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  care_worker_id      uuid NOT NULL REFERENCES care_workers(id) ON DELETE CASCADE,
  anbieter_id         uuid NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  bezeichnung         text NOT NULL,           -- "Pflegefachkraft (exam.)", "Erste-Hilfe-Kurs"
  ausstellende_stelle text,
  ausgestellt_am      date,
  gueltig_bis         date,
  zertifikat_nr       text,
  dokument_url        text,                    -- Supabase Storage URL
  typ                 text NOT NULL DEFAULT 'sonstige'
                      CHECK (typ IN ('berufsabschluss','fortbildung','erste_hilfe','hygiene','datenschutz','sonstige')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON care_worker_zertifikate (care_worker_id);
CREATE INDEX ON care_worker_zertifikate (anbieter_id, gueltig_bis);

ALTER TABLE care_worker_zertifikate ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_manage_zertifikate"
  ON care_worker_zertifikate FOR ALL
  USING (anbieter_id IN (
    SELECT a.id FROM anbieter a JOIN profiles p ON p.id = a.profile_id WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "admin_zertifikate"
  ON care_worker_zertifikate FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Ablauf-Warnung View (30 / 60 Tage)
CREATE OR REPLACE VIEW zertifikat_ablaufwarnungen AS
SELECT
  z.id,
  z.care_worker_id,
  z.anbieter_id,
  cw.vorname || ' ' || cw.nachname AS care_worker_name,
  z.bezeichnung,
  z.typ,
  z.gueltig_bis,
  (z.gueltig_bis - CURRENT_DATE) AS tage_bis_ablauf,
  CASE
    WHEN z.gueltig_bis < CURRENT_DATE THEN 'abgelaufen'
    WHEN z.gueltig_bis <= CURRENT_DATE + 30 THEN 'kritisch'
    WHEN z.gueltig_bis <= CURRENT_DATE + 60 THEN 'warnung'
    ELSE 'ok'
  END AS status
FROM care_worker_zertifikate z
JOIN care_workers cw ON cw.id = z.care_worker_id
WHERE z.gueltig_bis IS NOT NULL
ORDER BY z.gueltig_bis ASC;

-- 8D: Familie Kommunikations-Hub
CREATE TABLE IF NOT EXISTS familie_pinnwand (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familie_profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Ersteller kann Anbieter oder Familienmitglied sein
  erstellt_von        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  erstellt_von_rolle  text CHECK (erstellt_von_rolle IN ('familie','anbieter')),
  typ                 text NOT NULL DEFAULT 'notiz'
                      CHECK (typ IN ('notiz','aufgabe','update','wichtig')),
  inhalt              text NOT NULL,
  erledigt            boolean DEFAULT false,
  erledigt_am         timestamptz,
  pinned              boolean DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON familie_pinnwand (familie_profile_id, created_at DESC);
CREATE INDEX ON familie_pinnwand (familie_profile_id, erledigt, typ);

ALTER TABLE familie_pinnwand ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_manage_pinnwand"
  ON familie_pinnwand FOR ALL
  USING (
    familie_profile_id IN (
      SELECT DISTINCT pf.familie_profile_id
      FROM pflegedokumentation pf
      JOIN anbieter a ON a.id = pf.anbieter_id
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "familie_manage_pinnwand"
  ON familie_pinnwand FOR ALL
  USING (familie_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "admin_pinnwand"
  ON familie_pinnwand FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE TRIGGER pinnwand_updated_at
  BEFORE UPDATE ON familie_pinnwand
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

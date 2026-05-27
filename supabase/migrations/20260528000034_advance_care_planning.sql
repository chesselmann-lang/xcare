-- ============================================================
-- F40: Advance Care Planning — Patientenverfügung & Vorsorgedokumente
-- ============================================================

-- ── 1. Patientenverfügung ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patientenverfuegung (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  -- Persönliche Daten des Verfassers
  vollstaendiger_name       TEXT,
  geburtsdatum              DATE,
  geburtsort                TEXT,
  strasse                   TEXT,
  plz                       TEXT,
  ort                       TEXT,
  -- Vertrauensperson
  vertrauensperson_name     TEXT,
  vertrauensperson_telefon  TEXT,
  vertrauensperson_relation TEXT,
  -- Verfügungen (JSONB für Flexibilität)
  verfuegungen              JSONB NOT NULL DEFAULT '{
    "lebenserhaltende_massnahmen": null,
    "kuenstliche_ernaehrung": null,
    "beatmung": null,
    "wiederbelebung": null,
    "schmerzlinderung": true,
    "palliative_massnahmen": true,
    "organspende": null,
    "sterbehilfe_passiv": null
  }'::jsonb,
  -- Freitext-Wünsche
  wuensche_sterbeprozess    TEXT,
  ort_des_sterbens          TEXT CHECK (ort_des_sterbens IN ('zuhause','hospiz','krankenhaus','pflegeheim','egal')),
  sonstige_wuensche         TEXT,
  -- Metadaten
  unterschrift_datum        DATE,
  zeugen_name_1             TEXT,
  zeugen_name_2             TEXT,
  arzt_kenntnisgenommen     BOOLEAN DEFAULT false,
  status                    TEXT DEFAULT 'entwurf' CHECK (status IN ('entwurf','fertiggestellt','hinterlegt')),
  erstellt_am               TIMESTAMPTZ DEFAULT now(),
  aktualisiert_am           TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_patientenverfuegung_aktualisiert
  BEFORE UPDATE ON patientenverfuegung
  FOR EACH ROW EXECUTE FUNCTION public.entlastung_einstellungen_set_aktualisiert_am();

ALTER TABLE patientenverfuegung ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pv_select" ON patientenverfuegung FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "pv_insert" ON patientenverfuegung FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "pv_update" ON patientenverfuegung FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- ── 2. Vorsorgevollmacht ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vorsorgevollmacht (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  bevollmaechtigte_name     TEXT NOT NULL,
  bevollmaechtigte_adresse  TEXT,
  bevollmaechtigte_telefon  TEXT,
  bevollmaechtigte_email    TEXT,
  -- Vollmacht-Umfang
  gesundheit                BOOLEAN DEFAULT true,
  aufenthalt                BOOLEAN DEFAULT true,
  finanzen                  BOOLEAN DEFAULT false,
  post_und_kommunikation    BOOLEAN DEFAULT false,
  -- Ersatzbevollmächtigte
  ersatz_name               TEXT,
  ersatz_telefon            TEXT,
  -- Status
  notariell_beglaubigt      BOOLEAN DEFAULT false,
  beglaubigung_datum        DATE,
  notar_name                TEXT,
  beim_zentralregister      BOOLEAN DEFAULT false,
  status                    TEXT DEFAULT 'entwurf' CHECK (status IN ('entwurf','fertiggestellt','notariell')),
  erstellt_am               TIMESTAMPTZ DEFAULT now(),
  aktualisiert_am           TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_vorsorgevollmacht_aktualisiert
  BEFORE UPDATE ON vorsorgevollmacht
  FOR EACH ROW EXECUTE FUNCTION public.entlastung_einstellungen_set_aktualisiert_am();

ALTER TABLE vorsorgevollmacht ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vv_select" ON vorsorgevollmacht FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "vv_insert" ON vorsorgevollmacht FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "vv_update" ON vorsorgevollmacht FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- ── 3. ACP-Dokumente (gespeicherte Versionen) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS acp_dokumente (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  typ           TEXT CHECK (typ IN ('patientenverfuegung','vorsorgevollmacht','betreuungsverfuegung')),
  version       INT DEFAULT 1,
  datei_url     TEXT,
  notizen       TEXT,
  erstellt_am   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE acp_dokumente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acp_dok_select" ON acp_dokumente FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "acp_dok_insert" ON acp_dokumente FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "acp_dok_delete" ON acp_dokumente FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- F45: Ernährungsplan & Flüssigkeitsbilanz
-- ============================================================

-- ── 1. Ernährungsprofil ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ernaehrungsprofil (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  -- MNA-Screening (Mini Nutritional Assessment)
  mna_gewichtsverlust INT DEFAULT 0 CHECK (mna_gewichtsverlust IN (0,1,2,3)),
  mna_mobilitaet      INT DEFAULT 0 CHECK (mna_mobilitaet IN (0,1,2)),
  mna_stress          INT DEFAULT 0 CHECK (mna_stress IN (0,2)),
  mna_neuropsych      INT DEFAULT 0 CHECK (mna_neuropsych IN (0,1,2)),
  mna_bmi             INT DEFAULT 0 CHECK (mna_bmi IN (0,1,2,3)),
  -- Kostform
  kostform            TEXT DEFAULT 'normal' CHECK (kostform IN ('normal','leicht_verdaulich','passiert','fluessig','hochkalorisch','diabetisch','vegetarisch','vegan','sonstiges')),
  dysphagie_level     INT DEFAULT 0 CHECK (dysphagie_level BETWEEN 0 AND 7),   -- IDDSI Level 0-7
  -- Unverträglichkeiten / Allergien
  nahrungsmittelallergien TEXT[] DEFAULT '{}',
  unvertraeglichkeiten    TEXT[] DEFAULT '{}',
  -- Flüssigkeitsbedarf
  flüssigkeitsbedarf_ml   INT DEFAULT 1500,
  -- Zielwerte
  kalorienziel_kcal       INT,
  proteinziel_g           NUMERIC(5,1),
  -- Besonderheiten
  besonderheiten          TEXT,
  ernaehrungsberater      TEXT,
  letztes_mna_datum       DATE,
  erstellt_am             TIMESTAMPTZ DEFAULT now(),
  aktualisiert_am         TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_ernaehrung_aktualisiert
  BEFORE UPDATE ON ernaehrungsprofil
  FOR EACH ROW EXECUTE FUNCTION public.entlastung_einstellungen_set_aktualisiert_am();

ALTER TABLE ernaehrungsprofil ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ep_select" ON ernaehrungsprofil FOR SELECT USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "ep_insert" ON ernaehrungsprofil FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "ep_update" ON ernaehrungsprofil FOR UPDATE USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Tages-Flüssigkeitsbilanz ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fluessigkeitsbilanz (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bilanz_datum    DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Einnahme
  trinkmenge_ml   INT DEFAULT 0,
  nahrung_ml      INT DEFAULT 0,       -- Flüssigkeit aus Nahrung
  infusion_ml     INT DEFAULT 0,
  -- Ausfuhr
  urin_ml         INT DEFAULT 0,
  sonstiges_ml    INT DEFAULT 0,
  -- Bilanz
  bilanz_ml       INT GENERATED ALWAYS AS ((trinkmenge_ml + nahrung_ml + infusion_ml) - (urin_ml + sonstiges_ml)) STORED,
  -- Details
  einzel_getraenke JSONB DEFAULT '[]'::jsonb,
  notizen         TEXT,
  erstellt_am     TIMESTAMPTZ DEFAULT now(),
  aktualisiert_am TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, bilanz_datum)
);

CREATE INDEX IF NOT EXISTS fluessigkeit_user_datum_idx ON fluessigkeitsbilanz(user_id, bilanz_datum DESC);
ALTER TABLE fluessigkeitsbilanz ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "fl_select" ON fluessigkeitsbilanz FOR SELECT USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "fl_insert" ON fluessigkeitsbilanz FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "fl_update" ON fluessigkeitsbilanz FOR UPDATE USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. Mahlzeiten-Protokoll ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mahlzeiten_protokoll (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mahlzeit_datum  DATE NOT NULL DEFAULT CURRENT_DATE,
  tageszeit       TEXT CHECK (tageszeit IN ('fruehstueck','zwischenmahlzeit_vm','mittagessen','zwischenmahlzeit_nm','abendessen','spaetmahlzeit')),
  portion         TEXT DEFAULT 'ganz' CHECK (portion IN ('ganz','dreiviertel','halb','viertel','gar_nicht')),
  kcal_schaetzung INT,
  nahrungsmittel  TEXT,
  notizen         TEXT,
  erstellt_am     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mahlzeiten_user_datum_idx ON mahlzeiten_protokoll(user_id, mahlzeit_datum DESC);
ALTER TABLE mahlzeiten_protokoll ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "mahl_select" ON mahlzeiten_protokoll FOR SELECT USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "mahl_insert" ON mahlzeiten_protokoll FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "mahl_update" ON mahlzeiten_protokoll FOR UPDATE USING ((SELECT auth.uid()) = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

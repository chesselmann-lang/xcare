-- ============================================================
-- F38: Pflegegeld-Abrechnung §37 SGB XI
-- Monatliche Pflegegeld-Verwaltung + Beratungsnachweis-Tracking
-- ============================================================

-- ── 1. Pflegegeld-Einstellungen je Nutzer ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS pflegegeld_einstellungen (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  pflegegrad            INT NOT NULL DEFAULT 2 CHECK (pflegegrad BETWEEN 2 AND 5),
  -- Pflegegeld-Beträge 2025 in Cent
  -- PG2: 33200, PG3: 57300, PG4: 76500, PG5: 94700
  pflegegeld_cent       INT NOT NULL DEFAULT 33200,
  kombinationsleistung  BOOLEAN DEFAULT false,
  sachleistungsanteil   INT DEFAULT 0 CHECK (sachleistungsanteil BETWEEN 0 AND 100),
  pflegekasse_name      TEXT,
  pflegekasse_nr        TEXT,
  versichertennummer    TEXT,
  erstellt_am           TIMESTAMPTZ DEFAULT now(),
  aktualisiert_am       TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_pflegegeld_einst_aktualisiert
  BEFORE UPDATE ON pflegegeld_einstellungen
  FOR EACH ROW EXECUTE FUNCTION public.entlastung_einstellungen_set_aktualisiert_am();

ALTER TABLE pflegegeld_einstellungen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pflegegeld_einst_select" ON pflegegeld_einstellungen FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "pflegegeld_einst_insert" ON pflegegeld_einstellungen FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "pflegegeld_einst_update" ON pflegegeld_einstellungen FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- ── 2. Monatliche Auszahlungshistorie ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pflegegeld_auszahlungen (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  jahr                  INT NOT NULL CHECK (jahr BETWEEN 2020 AND 2030),
  monat                 INT NOT NULL CHECK (monat BETWEEN 1 AND 12),
  betrag_cent           INT NOT NULL CHECK (betrag_cent > 0),
  status                TEXT NOT NULL DEFAULT 'erwartet'
                        CHECK (status IN ('erwartet','erhalten','ausgeblieben','teilweise')),
  eingang_datum         DATE,
  notiz                 TEXT,
  erstellt_am           TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, jahr, monat)
);

CREATE INDEX IF NOT EXISTS pflegegeld_ausz_user_idx ON pflegegeld_auszahlungen(user_id, jahr, monat DESC);
ALTER TABLE pflegegeld_auszahlungen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pflegegeld_ausz_select" ON pflegegeld_auszahlungen FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "pflegegeld_ausz_insert" ON pflegegeld_auszahlungen FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "pflegegeld_ausz_update" ON pflegegeld_auszahlungen FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "pflegegeld_ausz_delete" ON pflegegeld_auszahlungen FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ── 3. Beratungsnachweis-Tracking (§37 Abs. 3 SGB XI) ─────────────────────────
-- Pflegegeld-Empfänger müssen regelmäßig Beratungsbesuche nachweisen
CREATE TABLE IF NOT EXISTS beratungsnachweise (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  beratungs_datum       DATE NOT NULL,
  berater_name          TEXT,
  berater_organisation  TEXT,
  beratungsart          TEXT DEFAULT 'ambulant'
                        CHECK (beratungsart IN ('ambulant','pflegekasse','pflegedienst','sonstige')),
  nachweis_eingereicht  BOOLEAN DEFAULT false,
  eingereicht_am        DATE,
  pflegekasse_bestaetigt BOOLEAN DEFAULT false,
  notizen               TEXT,
  erstellt_am           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS beratungsnachweise_user_idx ON beratungsnachweise(user_id, beratungs_datum DESC);
ALTER TABLE beratungsnachweise ENABLE ROW LEVEL SECURITY;
CREATE POLICY "beratungsnachweise_select" ON beratungsnachweise FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "beratungsnachweise_insert" ON beratungsnachweise FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "beratungsnachweise_update" ON beratungsnachweise FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "beratungsnachweise_delete" ON beratungsnachweise FOR DELETE USING ((SELECT auth.uid()) = user_id);

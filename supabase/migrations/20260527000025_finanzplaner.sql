-- ============================================================
-- F31: Pflege-Finanzplaner & Steuer-Optimierer
-- Financial tracking for care costs + tax year summaries
-- ============================================================

-- ── 1. Pflege-Ausgaben ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pflege_ausgaben (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  datum                     DATE NOT NULL,
  kategorie                 TEXT NOT NULL CHECK (kategorie IN (
    'ambulante_pflege',
    'stationaere_pflege',
    'hilfsmittel',
    'medikamente',
    'haushaltshilfe',
    'fahrtkosten',
    'umbaumassnahmen',
    'kurzzeitpflege',
    'tagespflege',
    'verhinderungspflege',
    'sonstiges'
  )),
  bezeichnung               TEXT NOT NULL,
  betrag_cent               INT  NOT NULL CHECK (betrag_cent > 0),
  erstattung_kasse_cent     INT  NOT NULL DEFAULT 0 CHECK (erstattung_kasse_cent >= 0),
  erstattung_sonstige_cent  INT  NOT NULL DEFAULT 0 CHECK (erstattung_sonstige_cent >= 0),
  steuerlich_paragraph      TEXT CHECK (steuerlich_paragraph IN ('§35a', '§33', '§33b')),
  belegnummer               TEXT,
  anbieter                  TEXT,
  notiz                     TEXT,
  jahressteuererklaerung_jahr INT,
  erstellt_am               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pflege_ausgaben_user_datum_idx
  ON pflege_ausgaben (user_id, datum DESC);

CREATE INDEX IF NOT EXISTS pflege_ausgaben_user_kategorie_idx
  ON pflege_ausgaben (user_id, kategorie);

ALTER TABLE pflege_ausgaben ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pflege_ausgaben_owner_select"
  ON pflege_ausgaben FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "pflege_ausgaben_owner_insert"
  ON pflege_ausgaben FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "pflege_ausgaben_owner_update"
  ON pflege_ausgaben FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "pflege_ausgaben_owner_delete"
  ON pflege_ausgaben FOR DELETE
  USING (user_id = auth.uid());


-- ── 2. Steuer-Zusammenfassungen ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS steuer_zusammenfassungen (
  id                                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  steuerjahr                            INT  NOT NULL CHECK (steuerjahr BETWEEN 2020 AND 2030),
  paragraph_35a_basis_cent              INT  NOT NULL DEFAULT 0,
  paragraph_35a_steuerminderung_cent    INT  NOT NULL DEFAULT 0,
  paragraph_33_ausgaben_cent            INT  NOT NULL DEFAULT 0,
  paragraph_33b_pflegepauschbetrag_cent INT  NOT NULL DEFAULT 0,
  gesamtausgaben_cent                   INT  NOT NULL DEFAULT 0,
  eigenanteil_cent                      INT  NOT NULL DEFAULT 0,
  erstattungen_gesamt_cent              INT  NOT NULL DEFAULT 0,
  notizen                               TEXT,
  erstellt_am                           TIMESTAMPTZ NOT NULL DEFAULT now(),
  aktualisiert_am                       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, steuerjahr)
);

ALTER TABLE steuer_zusammenfassungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "steuer_zusammenfassungen_owner_select"
  ON steuer_zusammenfassungen FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "steuer_zusammenfassungen_owner_insert"
  ON steuer_zusammenfassungen FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "steuer_zusammenfassungen_owner_update"
  ON steuer_zusammenfassungen FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "steuer_zusammenfassungen_owner_delete"
  ON steuer_zusammenfassungen FOR DELETE
  USING (user_id = auth.uid());


-- ── 3. Haushaltshilfe-Verträge ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS haushaltshilfe_vertraege (
  id                            UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       UUID     NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                          TEXT     NOT NULL,
  beginn_datum                  DATE     NOT NULL,
  ende_datum                    DATE,
  monatslohn_cent               INT      NOT NULL CHECK (monatslohn_cent > 0),
  wochenstunden                 NUMERIC(4,1),
  minijob_angemeldet            BOOLEAN  NOT NULL DEFAULT false,
  sv_beitraege_arbeitgeber_cent INT      NOT NULL DEFAULT 0,
  erstellt_am                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS haushaltshilfe_vertraege_user_idx
  ON haushaltshilfe_vertraege (user_id);

ALTER TABLE haushaltshilfe_vertraege ENABLE ROW LEVEL SECURITY;

CREATE POLICY "haushaltshilfe_vertraege_owner_select"
  ON haushaltshilfe_vertraege FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "haushaltshilfe_vertraege_owner_insert"
  ON haushaltshilfe_vertraege FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "haushaltshilfe_vertraege_owner_update"
  ON haushaltshilfe_vertraege FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "haushaltshilfe_vertraege_owner_delete"
  ON haushaltshilfe_vertraege FOR DELETE
  USING (user_id = auth.uid());

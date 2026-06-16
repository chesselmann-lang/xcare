-- F74: Beschwerdemanagement-System §75 SGB XI
-- Vollständiger Beschwerdeworkflow mit Eskalationsstufen

CREATE TYPE beschwerde_kategorie AS ENUM (
  'pflege', 'personal', 'ernaehrung', 'sauberkeit', 'sicherheit',
  'kommunikation', 'verwaltung', 'raeumlichkeiten', 'sonstiges'
);

CREATE TYPE beschwerde_status AS ENUM (
  'eingegangen', 'in_bearbeitung', 'eskaliert', 'abgeschlossen', 'abgewiesen'
);

CREATE TYPE beschwerde_eskalation AS ENUM (
  'intern', 'heimleitung', 'betreuungsbehoerde', 'mdk', 'ombudsmann'
);

CREATE TABLE IF NOT EXISTS beschwerden (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id         UUID NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  bewohner_id         UUID REFERENCES bewohner(id) ON DELETE SET NULL,

  -- Einreicher
  einreicher_typ      TEXT NOT NULL DEFAULT 'angehoerige', -- 'angehoerige' | 'bewohner' | 'mitarbeiter' | 'anonym'
  einreicher_name     TEXT,
  einreicher_email    TEXT,
  angehoerige_id      UUID REFERENCES bewohner_angehoerige(id) ON DELETE SET NULL,

  -- Beschwerde-Inhalt
  kategorie           beschwerde_kategorie NOT NULL DEFAULT 'sonstiges',
  betreff             TEXT NOT NULL,
  beschreibung        TEXT NOT NULL,
  vorfall_datum       DATE,
  dokumente           TEXT[],  -- Storage-URLs

  -- Bearbeitung
  status              beschwerde_status NOT NULL DEFAULT 'eingegangen',
  eskalationsstufe    beschwerde_eskalation DEFAULT 'intern',
  zugewiesen_an       UUID REFERENCES profiles(id),
  frist               DATE,
  massnahmen          TEXT,
  ergebnis            TEXT,
  interne_notizen     TEXT,

  -- Feedback
  einreicher_benachrichtigt BOOLEAN DEFAULT FALSE,
  zufriedenheit       INTEGER CHECK (zufriedenheit BETWEEN 1 AND 5),
  feedback            TEXT,

  erstellt_am         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  abgeschlossen_am    TIMESTAMPTZ
);

-- Verlaufsprotokoll
CREATE TABLE IF NOT EXISTS beschwerde_verlauf (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beschwerde_id   UUID NOT NULL REFERENCES beschwerden(id) ON DELETE CASCADE,
  aktion          TEXT NOT NULL,
  notiz           TEXT,
  von_profil_id   UUID REFERENCES profiles(id),
  erstellt_am     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE beschwerden ENABLE ROW LEVEL SECURITY;
ALTER TABLE beschwerde_verlauf ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_own_beschwerden" ON beschwerden
  FOR ALL USING (
    anbieter_id = (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.owner_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "anbieter_own_beschwerde_verlauf" ON beschwerde_verlauf
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM beschwerden b
      JOIN anbieter a ON a.id = b.anbieter_id
      JOIN profiles p ON p.id = a.owner_id
      WHERE b.id = beschwerde_verlauf.beschwerde_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "admin_read_beschwerden" ON beschwerden
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- updated_at Trigger
CREATE OR REPLACE FUNCTION update_beschwerden_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_beschwerden_updated_at
  BEFORE UPDATE ON beschwerden
  FOR EACH ROW EXECUTE FUNCTION update_beschwerden_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_beschwerden_anbieter ON beschwerden(anbieter_id);
CREATE INDEX IF NOT EXISTS idx_beschwerden_bewohner ON beschwerden(bewohner_id);
CREATE INDEX IF NOT EXISTS idx_beschwerden_status ON beschwerden(status);
CREATE INDEX IF NOT EXISTS idx_beschwerde_verlauf_beschwerde ON beschwerde_verlauf(beschwerde_id);

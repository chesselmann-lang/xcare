-- F73: Bewohner-Biografie & Lebensgeschichte
-- Personenzentrierte Pflege nach Erwin Böhm / Roger Moss-Modell

CREATE TABLE IF NOT EXISTS bewohner_biografien (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id           UUID NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  bewohner_id           UUID NOT NULL REFERENCES bewohner(id) ON DELETE CASCADE,

  -- Persönliche Daten
  geburtsort            TEXT,
  geburtsland           TEXT,
  nationalitaet         TEXT,
  muttersprache         TEXT,
  weitere_sprachen      TEXT[],
  familienstand         TEXT, -- ledig/verheiratet/verwitwet/geschieden/getrennt
  kinder_anzahl         INTEGER,
  geschwister_anzahl    INTEGER,

  -- Lebensgeschichte
  kindheit_jugend       TEXT,
  ausbildung_beruf      TEXT,
  wichtige_lebensereignisse TEXT,
  wohnorte              TEXT,
  kriegserfahrungen     BOOLEAN DEFAULT FALSE,
  fluchterfahrungen     BOOLEAN DEFAULT FALSE,

  -- Persönlichkeit & Gewohnheiten
  vorlieben             TEXT[],   -- Lieblingsspeisen, Musik, Hobbys etc.
  abneigungen           TEXT[],
  rituale_gewohnheiten  TEXT,     -- Morgenroutine, Abendritual etc.
  schlafgewohnheiten    TEXT,
  mahlzeiten_besonderheiten TEXT,

  -- Religiöse & kulturelle Aspekte
  religion              TEXT,
  religioese_praktiken  TEXT,
  kulturelle_besonderheiten TEXT,
  bestattungswuensche   TEXT,

  -- Medien & Interessen
  lieblingsmusik        TEXT[],
  lieblingsfilme_buecher TEXT[],
  hobbys_frueher        TEXT[],
  hobbys_jetzt          TEXT[],

  -- Soziales Umfeld
  wichtige_bezugspersonen TEXT,   -- Name + Beziehung
  haustiere_frueher     TEXT,
  berufe                TEXT[],

  -- Pflegerelevante Hinweise (aus Biografie abgeleitet)
  kommunikations_tipps  TEXT,
  beruhigungs_tipps     TEXT,
  aktivierungs_tipps    TEXT,

  -- Metadaten
  erstellt_von          UUID REFERENCES profiles(id),
  zuletzt_aktualisiert_von UUID REFERENCES profiles(id),
  erstellt_am           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (bewohner_id)
);

-- RLS
ALTER TABLE bewohner_biografien ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_own_biografien" ON bewohner_biografien
  FOR ALL USING (
    anbieter_id = (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.owner_id
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "admin_read_biografien" ON bewohner_biografien
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- updated_at Trigger
CREATE OR REPLACE FUNCTION update_bewohner_biografien_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_bewohner_biografien_updated_at
  BEFORE UPDATE ON bewohner_biografien
  FOR EACH ROW EXECUTE FUNCTION update_bewohner_biografien_updated_at();

-- Index
CREATE INDEX IF NOT EXISTS idx_bewohner_biografien_bewohner ON bewohner_biografien(bewohner_id);
CREATE INDEX IF NOT EXISTS idx_bewohner_biografien_anbieter ON bewohner_biografien(anbieter_id);

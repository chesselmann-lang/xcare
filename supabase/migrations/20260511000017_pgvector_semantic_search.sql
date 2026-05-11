-- Phase 9B: pgvector + Semantische Anspruchs-Suche
-- Embeddings für Leistungen/Ansprüche — semantische Suche via KI

-- pgvector Extension aktivieren
CREATE EXTENSION IF NOT EXISTS vector;

-- Embeddings-Tabelle für Leistungen
CREATE TABLE IF NOT EXISTS leistungen_embeddings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leistung_code   TEXT NOT NULL UNIQUE,        -- z.B. 'pflegegeld_sg11_37'
  leistung_titel  TEXT NOT NULL,
  leistung_beschreibung TEXT NOT NULL,
  embedding       vector(1536),                -- OpenAI text-embedding-3-small / Anthropic
  lebenslage      TEXT,
  rechtsgrundlage TEXT,
  max_betrag_eur  INTEGER,                     -- Monatlicher Höchstbetrag in Cent
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Semantische Suche Funktion
CREATE OR REPLACE FUNCTION match_leistungen(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.75,
  match_count     INT DEFAULT 10
)
RETURNS TABLE (
  id              UUID,
  leistung_code   TEXT,
  leistung_titel  TEXT,
  leistung_beschreibung TEXT,
  lebenslage      TEXT,
  rechtsgrundlage TEXT,
  max_betrag_eur  INTEGER,
  similarity      FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    le.id,
    le.leistung_code,
    le.leistung_titel,
    le.leistung_beschreibung,
    le.lebenslage,
    le.rechtsgrundlage,
    le.max_betrag_eur,
    1 - (le.embedding <=> query_embedding) AS similarity
  FROM leistungen_embeddings le
  WHERE 1 - (le.embedding <=> query_embedding) > match_threshold
  ORDER BY le.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Index für schnelle Cosine-Similarity-Suche (HNSW)
CREATE INDEX IF NOT EXISTS leistungen_embeddings_hnsw_idx
  ON leistungen_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- RLS
ALTER TABLE leistungen_embeddings ENABLE ROW LEVEL SECURITY;

-- Öffentlich lesbar (Ansprüche sind nicht sensitiv)
CREATE POLICY "public_read_leistungen_embeddings" ON leistungen_embeddings
  FOR SELECT TO anon, authenticated
  USING (true);

-- Nur Admin/Service kann schreiben
CREATE POLICY "service_write_leistungen_embeddings" ON leistungen_embeddings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed: Kern-Leistungen mit Beschreibungen (Embeddings werden via API befüllt)
INSERT INTO leistungen_embeddings (leistung_code, leistung_titel, leistung_beschreibung, lebenslage, rechtsgrundlage, max_betrag_eur)
VALUES
  ('pflegegeld_sgb11_37', 'Pflegegeld §37 SGB XI', 'Monatliche Geldleistung für häusliche Pflege durch Angehörige. Pflegegrad 1: 0€, Pflegegrad 2: 332€, Pflegegrad 3: 573€, Pflegegrad 4: 765€, Pflegegrad 5: 947€.', 'alter_pflege', '§37 SGB XI', 94700),
  ('pflegesachleistung_sgb11_36', 'Pflegesachleistung §36 SGB XI', 'Leistungen für ambulante Pflegedienste. Pflegegrad 2: 761€, Pflegegrad 3: 1.432€, Pflegegrad 4: 1.778€, Pflegegrad 5: 2.200€ monatlich.', 'alter_pflege', '§36 SGB XI', 220000),
  ('verhinderungspflege_sgb11_39', 'Verhinderungspflege §39 SGB XI', 'Bis zu 1.612€ jährlich für Ersatzpflege wenn reguläre Pflegeperson verhindert ist. Bis 6 Wochen jährlich.', 'alter_pflege', '§39 SGB XI', 161200),
  ('kurzzeitpflege_sgb11_42', 'Kurzzeitpflege §42 SGB XI', 'Stationäre Pflege bis 8 Wochen jährlich, bis 1.774€. Bei Pflegegrad 2-5.', 'alter_pflege', '§42 SGB XI', 177400),
  ('tagespflege_sgb11_41', 'Tages- und Nachtpflege §41 SGB XI', 'Teilstationäre Tages- oder Nachtpflege. Pflegegrad 2: 689€, Pflegegrad 3: 1.298€, Pflegegrad 4: 1.612€, Pflegegrad 5: 1.995€.', 'alter_pflege', '§41 SGB XI', 199500),
  ('entlastungsbetrag_sgb11_45b', 'Entlastungsbetrag §45b SGB XI', '125€ monatlich für anerkannte Unterstützungsangebote. Ab Pflegegrad 1. Kann angespart werden.', 'alter_pflege', '§45b SGB XI', 12500),
  ('elterngeld_beeg', 'Elterngeld (BEEG)', 'Einkommensersatz nach Geburt. Basiselterngeld: 65-67% des Nettoeinkommens, mind. 300€, max. 1.800€/Monat für 12 Monate (+ 2 Partnermonate).', 'geburt_fruehe_kindheit', 'BEEG §1ff', 180000),
  ('kinderzuschlag_sgb2', 'Kinderzuschlag §6a BKGG', 'Bis zu 250€ monatlich je Kind für Familien mit geringem Einkommen. Ergänzend zum Kindergeld.', 'geburt_fruehe_kindheit', '§6a BKGG', 25000),
  ('wohngeld_wogg', 'Wohngeld (WoGG)', 'Zuschuss zur Miete für einkommensschwache Haushalte. Höhe abhängig von Haushaltsgröße, Einkommen und Miete.', 'erwerbsleben_vereinbarkeit', 'WoGG', 90000),
  ('buergergeld_sgb2', 'Bürgergeld §§19ff SGB II', 'Grundsicherung für Arbeitssuchende. Regelbedarf 2024: Alleinstehend 563€, Paare je 506€. Kosten der Unterkunft zusätzlich.', 'erwerbsleben_vereinbarkeit', '§§19ff SGB II', 56300),
  ('eingliederungshilfe_sgb9', 'Eingliederungshilfe §§99ff SGB IX', 'Leistungen zur Teilhabe für Menschen mit Behinderung. Persönliches Budget, Assistenzleistungen, Wohnen.', 'eingliederung_behinderung', '§§99ff SGB IX', NULL),
  ('sapv_sgb5_37b', 'Spezialisierte ambulante Palliativversorgung (SAPV) §37b SGB V', 'Ärztliche und pflegerische Versorgung von unheilbar Kranken zuhause durch spezialisierte Teams. Vollständig von Krankenkasse übernommen.', 'hospiz_palliativ', '§37b SGB V', NULL),
  ('pflegeunterstuetzungsgeld_sgb11_44a', 'Pflegeunterstützungsgeld §44a SGB XI', 'Kurzfristige Arbeitsverhinderung bis 10 Tage bei plötzlichem Pflegebedarf. 90% des Nettogehalts.', 'erwerbsleben_vereinbarkeit', '§44a SGB XI', NULL),
  ('haeusliche_krankenpflege_sgb5_37', 'Häusliche Krankenpflege §37 SGB V', 'Behandlungspflege durch Pflegedienst auf ärztliche Verordnung. Vollständig von Krankenkasse übernommen.', 'krankheit_genesung', '§37 SGB V', NULL)
ON CONFLICT (leistung_code) DO NOTHING;

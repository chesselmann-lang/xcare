-- Sprint 105: Full-Text-Suche
-- Enable pg_trgm for trigram similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index for fast ILIKE search on anbieter name, ort
CREATE INDEX IF NOT EXISTS idx_anbieter_name_trgm
  ON anbieter USING gin (name gin_trgm_ops)
  WHERE aktiv = true;

CREATE INDEX IF NOT EXISTS idx_anbieter_ort_trgm
  ON anbieter USING gin (ort gin_trgm_ops)
  WHERE aktiv = true;

-- Composite tsvector column for full-text search
ALTER TABLE anbieter
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('german', coalesce(name, '')), 'A') ||
      setweight(to_tsvector('german', coalesce(ort, '')), 'B') ||
      setweight(to_tsvector('german', coalesce(beschreibung, '')), 'C')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_anbieter_search_vector
  ON anbieter USING gin (search_vector)
  WHERE aktiv = true;

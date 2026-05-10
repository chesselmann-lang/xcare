-- Sprint 258: Enforce one bewertung per anfrage
-- If anfrage_id is supplied it must be unique in bewertungen.
-- NULL anfrage_id rows are excluded from the constraint (IS DISTINCT FROM NULL).

CREATE UNIQUE INDEX IF NOT EXISTS idx_bewertungen_anfrage_id_unique
  ON bewertungen (anfrage_id)
  WHERE anfrage_id IS NOT NULL;

COMMENT ON INDEX idx_bewertungen_anfrage_id_unique IS
  'Each completed Anfrage may receive exactly one Bewertung.';

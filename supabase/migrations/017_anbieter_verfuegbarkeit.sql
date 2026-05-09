-- Sprint 122: Verfügbarkeitsstatus für Anbieter
ALTER TABLE public.anbieter
  ADD COLUMN IF NOT EXISTS verfuegbarkeit text
    CHECK (verfuegbarkeit IN ('verfuegbar', 'eingeschraenkt', 'ausgebucht'))
    DEFAULT 'verfuegbar';

-- Sprint 109: Preiseinheit für Leistungen
ALTER TABLE leistungen
  ADD COLUMN IF NOT EXISTS preis_einheit text; -- 'Stunde', 'Tag', 'Monat', 'Pauschal', etc.

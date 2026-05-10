-- Sprint 250: DB CHECK constraints for data integrity
-- Ensures DB-level enforcement matches application-level validation

-- ── bewertungen: sterne must be 1..5 ────────────────────────────────────────
ALTER TABLE bewertungen
  ADD CONSTRAINT IF NOT EXISTS chk_bewertungen_sterne
  CHECK (sterne BETWEEN 1 AND 5);

-- ── nachrichten: inhalt must not be empty and max 2000 chars ────────────────
ALTER TABLE nachrichten
  ADD CONSTRAINT IF NOT EXISTS chk_nachrichten_inhalt_nonempty
  CHECK (length(trim(inhalt)) > 0);

ALTER TABLE nachrichten
  ADD CONSTRAINT IF NOT EXISTS chk_nachrichten_inhalt_maxlen
  CHECK (length(inhalt) <= 2000);

-- ── anfragen: status must be a known value ───────────────────────────────────
ALTER TABLE anfragen
  ADD CONSTRAINT IF NOT EXISTS chk_anfragen_status
  CHECK (status IN (
    'offen',
    'in_bearbeitung',
    'angeboten',
    'bestaetigt',
    'abgelehnt',
    'abgeschlossen'
  ));

-- ── anbieter: verfuegbarkeit must be a known value or NULL ───────────────────
ALTER TABLE anbieter
  ADD CONSTRAINT IF NOT EXISTS chk_anbieter_verfuegbarkeit
  CHECK (verfuegbarkeit IS NULL OR verfuegbarkeit IN (
    'verfuegbar',
    'eingeschraenkt',
    'ausgebucht'
  ));

-- ── profiles: role must be a known value ─────────────────────────────────────
ALTER TABLE profiles
  ADD CONSTRAINT IF NOT EXISTS chk_profiles_role
  CHECK (role IN ('familie', 'anbieter', 'admin'));

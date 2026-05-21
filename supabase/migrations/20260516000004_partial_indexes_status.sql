-- ─────────────────────────────────────────────────────────────────────────────
-- S301: Partial indexes for common status filter queries
-- ─────────────────────────────────────────────────────────────────────────────

-- Anfragen: open ones are the hot path (anbieter dashboard, family view)
CREATE INDEX IF NOT EXISTS idx_anfragen_offen
  ON public.anfragen (anbieter_id, created_at DESC)
  WHERE status = 'offen';

CREATE INDEX IF NOT EXISTS idx_anfragen_in_bearbeitung
  ON public.anfragen (anbieter_id, created_at DESC)
  WHERE status = 'in_bearbeitung';

CREATE INDEX IF NOT EXISTS idx_anfragen_familie_offen
  ON public.anfragen (familie_id, created_at DESC)
  WHERE status IN ('offen', 'in_bearbeitung', 'angeboten');

-- Benachrichtigungen: unread count is queried on every page load
CREATE INDEX IF NOT EXISTS idx_benachrichtigungen_unread
  ON public.benachrichtigungen (profile_id, created_at DESC)
  WHERE gelesen = false;

-- Anbieter: only active/verified shown in search
CREATE INDEX IF NOT EXISTS idx_anbieter_aktiv_verifiziert
  ON public.anbieter (erstellt_am DESC)
  WHERE verifiziert = true AND aktiv = true;

-- Care workers: only verified/available in search
CREATE INDEX IF NOT EXISTS idx_care_workers_available
  ON public.care_workers (erstellt_am DESC)
  WHERE verfuegbar = true AND verifiziert = true;

-- Leistungen: only non-deleted ones are ever displayed
CREATE INDEX IF NOT EXISTS idx_leistungen_active_anbieter
  ON public.leistungen (anbieter_id)
  WHERE deleted_at IS NULL;

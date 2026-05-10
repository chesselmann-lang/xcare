-- Migration 024: Email preferences per profile
-- Stores per-user notification preferences (JSON) and unsubscribe flags.
-- Default: all notifications enabled (empty object = all on).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_prefs JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.profiles.email_prefs IS
  'User email notification preferences. Keys: digest (bool), neue_anfrage (bool), statusupdate (bool), neue_nachricht (bool). False = opted out.';

-- ─────────────────────────────────────────────────────────────────────────────
-- S318: Feature-Flags System (Datenbank-basiert)
--
-- Ermöglicht das An-/Abschalten von Features ohne Redeploy.
-- Nur Admins können Flags lesen und schreiben (über Service-Role in API).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feature_flags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key          TEXT UNIQUE NOT NULL,
  enabled      BOOLEAN NOT NULL DEFAULT false,
  description  TEXT NOT NULL DEFAULT '',
  -- 0–100: Anteil der Nutzer, für die das Flag gilt (100 = alle)
  rollout_percent INTEGER NOT NULL DEFAULT 100 CHECK (rollout_percent BETWEEN 0 AND 100),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   TEXT NOT NULL DEFAULT ''   -- E-Mail-Adresse des Admins
);

-- Kommentar
COMMENT ON TABLE feature_flags IS 'Runtime Feature-Flags — via Admin-Dashboard steuerbar (S318)';

-- Index für schnellen Lookup nach Key
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags (key);

-- Trigger: updated_at automatisch setzen
CREATE OR REPLACE FUNCTION set_feature_flag_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION set_feature_flag_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Lesen: nur authentifizierte Nutzer (API prüft Admin-Rolle)
CREATE POLICY "feature_flags_read" ON feature_flags
  FOR SELECT USING (auth.role() = 'authenticated');

-- Schreiben: nur über service_role (API-Route mit Admin-Check)
CREATE POLICY "feature_flags_write" ON feature_flags
  FOR ALL USING (auth.role() = 'service_role');

-- ── Seed: Bekannte Feature-Flags anlegen ──────────────────────────────────
INSERT INTO feature_flags (key, enabled, description, rollout_percent) VALUES
  ('ki_lotse',            true,  'KI-Lotse (Claude Streaming Chat für Familien)',            100),
  ('ki_copilot',          true,  'KI-Co-Pilot (Tool-Use Beratungs-Chat)',                    100),
  ('stripe_payments',     true,  'Stripe Abo-Zahlungen für Anbieter',                        100),
  ('warteliste',          false, 'Öffentliche Wartelisten auf Anbieter-Profilen',             100),
  ('web_push',            false, 'Web-Push-Benachrichtigungen (Service Worker)',               0),
  ('pflegetagebuch',      false, 'Pflegetagebuch mit Stimmungs-Tracker für Familien',        100),
  ('dokument_vorschau',   false, 'In-Browser Vorschau für Dokumente im Tresor',              100),
  ('anbieter_clustering', false, 'Karten-Clustering in der Anbieter-Suche (MapLibre)',       100),
  ('kostenrechner',       true,  'Eigenanteil-Kostenrechner für Pflegeleistungen',           100),
  ('traeger_dashboard',   true,  'B2B Träger/Kommunen Dashboard (/traeger)',                 100),
  ('white_label',         true,  'White-Label Konfiguration für GKV-Partner',               100),
  ('social_share',        false, 'Social Share API auf Anbieter-Profilen',                  100)
ON CONFLICT (key) DO NOTHING;

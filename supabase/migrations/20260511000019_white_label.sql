-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 9G: White-Label Foundation für GKV/Versicherungspartner
-- ─────────────────────────────────────────────────────────────────────────────

-- White-Label Config Tabelle
CREATE TABLE IF NOT EXISTS white_label_configs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,           -- z.B. "aok", "tk", "barmer"
  domain        text UNIQUE,                     -- z.B. "pflege.aok.de"
  organisation  text NOT NULL,
  logo_url      text,
  favicon_url   text,
  -- Brand Colors (CSS custom properties)
  color_primary    text NOT NULL DEFAULT '#2563eb',
  color_secondary  text NOT NULL DEFAULT '#1e40af',
  color_accent     text NOT NULL DEFAULT '#3b82f6',
  -- Typography
  font_family      text NOT NULL DEFAULT 'Inter',
  -- Feature flags
  features         jsonb NOT NULL DEFAULT '{
    "ki_lotse": true,
    "anbieter_suche": true,
    "pflegekrafte": true,
    "traeger_portal": false,
    "dokumente_tresor": true,
    "chat": true
  }',
  -- Contact & Legal
  impressum_url      text,
  datenschutz_url    text,
  support_email      text,
  support_tel        text,
  -- Meta
  aktiv              boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- RLS: Nur Admins dürfen lesen/schreiben
ALTER TABLE white_label_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_white_label" ON white_label_configs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Öffentliches Lesen via Slug/Domain (für Middleware-Lookup ohne Auth)
CREATE POLICY "public_read_white_label" ON white_label_configs
  FOR SELECT
  USING (aktiv = true);

-- Seed-Daten: 3 GKV-Beispielpartner
INSERT INTO white_label_configs
  (slug, organisation, color_primary, color_secondary, color_accent, support_email, features)
VALUES
  (
    'aok',
    'AOK — Die Gesundheitskasse',
    '#006633',
    '#004d26',
    '#00a64f',
    'pflege@aok.de',
    '{
      "ki_lotse": true,
      "anbieter_suche": true,
      "pflegekrafte": true,
      "traeger_portal": true,
      "dokumente_tresor": true,
      "chat": true
    }'::jsonb
  ),
  (
    'tk',
    'Techniker Krankenkasse',
    '#003082',
    '#001f5c',
    '#0050cc',
    'pflege@tk.de',
    '{
      "ki_lotse": true,
      "anbieter_suche": true,
      "pflegekrafte": false,
      "traeger_portal": false,
      "dokumente_tresor": true,
      "chat": false
    }'::jsonb
  ),
  (
    'barmer',
    'BARMER',
    '#e4002b',
    '#b00021',
    '#ff1a47',
    'pflege@barmer.de',
    '{
      "ki_lotse": true,
      "anbieter_suche": true,
      "pflegekrafte": true,
      "traeger_portal": false,
      "dokumente_tresor": true,
      "chat": true
    }'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;

-- Indizes
CREATE INDEX IF NOT EXISTS idx_white_label_domain ON white_label_configs(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_white_label_slug ON white_label_configs(slug);

-- Updated_at Trigger
CREATE OR REPLACE FUNCTION update_white_label_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_white_label_configs_updated_at
  BEFORE UPDATE ON white_label_configs
  FOR EACH ROW EXECUTE FUNCTION update_white_label_updated_at();

COMMENT ON TABLE white_label_configs IS
  'White-Label Konfigurationen für GKV/Versicherungspartner — Phase 9G';

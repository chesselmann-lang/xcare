-- email_templates: Admin-konfigurierbare E-Mail-Vorlagen
CREATE TABLE IF NOT EXISTS email_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  beschreibung text,
  betreff     text NOT NULL,
  html        text NOT NULL,
  text        text,
  aktiv       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_email_templates_updated_at();

-- RLS: nur admins dürfen lesen/schreiben
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_templates_admin_all" ON email_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Seed: Standardvorlagen (INSERT IGNORE falls bereits vorhanden)
INSERT INTO email_templates (name, beschreibung, betreff, html, aktiv)
VALUES
  (
    'anfrage_eingegangen_anbieter',
    'Gesendet an den Anbieter wenn eine neue Anfrage eingeht',
    'Neue Anfrage von {{name}}',
    '<p>Hallo,</p><p>Sie haben eine neue Anfrage von <strong>{{name}}</strong> erhalten.</p><p><a href="{{link}}">Zur Anfrage</a></p><p>Ihr xcare-Team</p>',
    true
  ),
  (
    'anfrage_status_familie',
    'Gesendet an die Familie wenn der Anfragestatus sich ändert',
    'Ihre Anfrage wurde {{status}}',
    '<p>Hallo {{name}},</p><p>Der Status Ihrer Anfrage bei <strong>{{anbieter_name}}</strong> wurde auf <strong>{{status}}</strong> geändert.</p><p><a href="{{link}}">Details ansehen</a></p><p>Ihr xcare-Team</p>',
    true
  ),
  (
    'anbieter_verifiziert',
    'Gesendet an den Anbieter nach erfolgreicher Verifizierung',
    'Ihr Profil wurde verifiziert ✓',
    '<p>Hallo {{name}},</p><p>Ihr Profil auf xcare wurde erfolgreich verifiziert. Sie erscheinen jetzt mit dem Verifikations-Badge in der Suche.</p><p><a href="{{link}}">Profil ansehen</a></p><p>Ihr xcare-Team</p>',
    true
  ),
  (
    'nachricht_neu',
    'Gesendet wenn eine neue Nachricht eingegangen ist',
    'Neue Nachricht von {{name}}',
    '<p>Hallo,</p><p>Sie haben eine neue Nachricht von <strong>{{name}}</strong> erhalten.</p><p><a href="{{link}}">Nachricht lesen</a></p><p>Ihr xcare-Team</p>',
    true
  ),
  (
    'bewertung_neu',
    'Gesendet an den Anbieter wenn eine neue Bewertung abgegeben wurde',
    'Neue Bewertung für Ihr Profil',
    '<p>Hallo {{name}},</p><p>Ein Nutzer hat eine neue Bewertung für Ihr Profil abgegeben.</p><p><a href="{{link}}">Bewertung ansehen</a></p><p>Ihr xcare-Team</p>',
    true
  )
ON CONFLICT (name) DO NOTHING;

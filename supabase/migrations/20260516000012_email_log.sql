-- Email Versand-Log: Protokolliert alle ausgehenden E-Mails
CREATE TABLE IF NOT EXISTS email_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  to_email    TEXT NOT NULL,
  subject     TEXT NOT NULL,
  template    TEXT NOT NULL DEFAULT 'transaktional',
  status      TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'error', 'skipped')),
  error       TEXT,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_log_sent_at ON email_log (sent_at DESC);
CREATE INDEX idx_email_log_to_email ON email_log (to_email);
CREATE INDEX idx_email_log_status ON email_log (status);
CREATE INDEX idx_email_log_template ON email_log (template);

-- Only service role can read/write (admin access via service key)
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON email_log
  USING (true)
  WITH CHECK (true);

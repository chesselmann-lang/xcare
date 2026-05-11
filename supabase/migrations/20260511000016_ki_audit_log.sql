-- Phase 9A: KI Audit Log — EU AI Act Compliance
-- Partitionierte Tabelle für alle KI-Aufrufe (monatliche Partitionen, 90 Tage Retention)

-- Basis-Tabelle (partitioniert)
CREATE TABLE IF NOT EXISTS ki_audit_log (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  user_pseudo_id  TEXT NOT NULL,           -- SHA-256(user_id + salt) — kein FK, pseudonymisiert
  model_version   TEXT NOT NULL,           -- z.B. 'claude-sonnet-4-6'
  endpoint        TEXT NOT NULL,           -- z.B. '/api/lotse', '/api/copilot'
  prompt_hash     TEXT NOT NULL,           -- SHA-256 des Prompts (kein Klartext)
  input_schema    TEXT,                    -- JSON-Schema des Inputs (keine Rohdaten)
  tokens_in       INTEGER,
  tokens_out      INTEGER,
  latency_ms      INTEGER,
  success         BOOLEAN NOT NULL DEFAULT true,
  error_code      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Partitionen für 2026 (aktuelle + nächste Monate)
CREATE TABLE IF NOT EXISTS ki_audit_log_2026_05 PARTITION OF ki_audit_log
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE IF NOT EXISTS ki_audit_log_2026_06 PARTITION OF ki_audit_log
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE IF NOT EXISTS ki_audit_log_2026_07 PARTITION OF ki_audit_log
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE IF NOT EXISTS ki_audit_log_2026_08 PARTITION OF ki_audit_log
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE IF NOT EXISTS ki_audit_log_2026_09 PARTITION OF ki_audit_log
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE IF NOT EXISTS ki_audit_log_2026_10 PARTITION OF ki_audit_log
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE IF NOT EXISTS ki_audit_log_2026_11 PARTITION OF ki_audit_log
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE IF NOT EXISTS ki_audit_log_2026_12 PARTITION OF ki_audit_log
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

CREATE TABLE IF NOT EXISTS ki_audit_log_2027_01 PARTITION OF ki_audit_log
  FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');

CREATE TABLE IF NOT EXISTS ki_audit_log_2027_02 PARTITION OF ki_audit_log
  FOR VALUES FROM ('2027-02-01') TO ('2027-03-01');

CREATE TABLE IF NOT EXISTS ki_audit_log_2027_03 PARTITION OF ki_audit_log
  FOR VALUES FROM ('2027-03-01') TO ('2027-04-01');

CREATE TABLE IF NOT EXISTS ki_audit_log_2027_04 PARTITION OF ki_audit_log
  FOR VALUES FROM ('2027-04-01') TO ('2027-05-01');

-- Indizes
CREATE INDEX IF NOT EXISTS ki_audit_log_created_at_idx ON ki_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS ki_audit_log_endpoint_idx ON ki_audit_log (endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS ki_audit_log_model_idx ON ki_audit_log (model_version, created_at DESC);

-- RLS
ALTER TABLE ki_audit_log ENABLE ROW LEVEL SECURITY;

-- Nur Admins können lesen
CREATE POLICY "admin_read_ki_audit_log" ON ki_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Service Role kann schreiben (via API-Routes)
CREATE POLICY "service_insert_ki_audit_log" ON ki_audit_log
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Aggregate-Statistiken für Admin-Dashboard
CREATE OR REPLACE VIEW ki_audit_stats AS
SELECT
  date_trunc('day', created_at) AS day,
  endpoint,
  model_version,
  COUNT(*) AS total_calls,
  SUM(tokens_in) AS total_tokens_in,
  SUM(tokens_out) AS total_tokens_out,
  AVG(latency_ms)::INTEGER AS avg_latency_ms,
  COUNT(*) FILTER (WHERE success = false) AS error_count,
  ROUND(AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) * 100, 2) AS success_rate_pct
FROM ki_audit_log
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;

-- Funktion zum automatischen Anlegen neuer Partitionen (monatlich via Cron)
CREATE OR REPLACE FUNCTION create_ki_audit_partition(target_month DATE)
RETURNS VOID AS $$
DECLARE
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
BEGIN
  partition_name := 'ki_audit_log_' || TO_CHAR(target_month, 'YYYY_MM');
  start_date := DATE_TRUNC('month', target_month);
  end_date := start_date + INTERVAL '1 month';

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF ki_audit_log FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;

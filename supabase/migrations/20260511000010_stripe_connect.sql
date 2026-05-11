-- ============================================================
-- Phase 5C: Stripe Connect Marktplatz-Zahlungen
-- Anbieter erhalten Connected Accounts.
-- Stundennachweise → Familie genehmigt → Zahlung per SEPA/Karte.
-- xcare nimmt 10 % Provision (application_fee_amount).
-- ============================================================

-- ---------------------------------------------------------
-- 1. Stripe Connect Accounts (je Anbieter einer)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id         uuid NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  stripe_account_id   text NOT NULL UNIQUE,        -- acct_...
  onboarding_complete boolean NOT NULL DEFAULT false,
  charges_enabled     boolean NOT NULL DEFAULT false,
  payouts_enabled     boolean NOT NULL DEFAULT false,
  details_submitted   boolean NOT NULL DEFAULT false,
  country             text NOT NULL DEFAULT 'DE',
  email               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (anbieter_id)
);

ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

-- Anbieter sieht nur eigenes Konto
CREATE POLICY "anbieter_own_connect"
  ON stripe_connect_accounts FOR ALL
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Admin liest alles
CREATE POLICY "admin_connect_read"
  ON stripe_connect_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ---------------------------------------------------------
-- 2. Stundennachweise (Hour Records)
-- Anbieter trägt geleistete Stunden ein → Familie genehmigt.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS stundennachweise (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id      uuid NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  care_worker_id   uuid NOT NULL REFERENCES care_workers(id) ON DELETE RESTRICT,
  -- Familie kann optional einem Profil zugeordnet sein
  familie_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  -- Leistungsdaten
  datum            date NOT NULL,
  stunden          numeric(5,2) NOT NULL CHECK (stunden > 0 AND stunden <= 24),
  stundensatz_ct   int NOT NULL CHECK (stundensatz_ct > 0),   -- Cent
  beschreibung     text,
  -- Status-Flow: pending → approved → invoiced → paid
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','rejected','invoiced','paid')),
  -- Stripe
  payment_intent_id     text,
  payment_status        text,  -- requires_payment_method | processing | succeeded | etc.
  stripe_charge_id      text,
  -- Zeitstempel
  created_at       timestamptz NOT NULL DEFAULT now(),
  approved_at      timestamptz,
  paid_at          timestamptz,
  -- Computed: Gesamtbetrag = stunden * stundensatz_ct
  betrag_ct        int GENERATED ALWAYS AS (
                     ROUND(stunden * stundensatz_ct)::int
                   ) STORED
);

CREATE INDEX ON stundennachweise (anbieter_id, status);
CREATE INDEX ON stundennachweise (care_worker_id);
CREATE INDEX ON stundennachweise (familie_profile_id);
CREATE INDEX ON stundennachweise (datum DESC);

ALTER TABLE stundennachweise ENABLE ROW LEVEL SECURITY;

-- Anbieter verwaltet eigene Einträge
CREATE POLICY "anbieter_manage_stunden"
  ON stundennachweise FOR ALL
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Familie sieht zugeordnete Stunden
CREATE POLICY "familie_view_stunden"
  ON stundennachweise FOR SELECT
  USING (
    familie_profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Familie darf status auf approved/rejected setzen
CREATE POLICY "familie_approve_stunden"
  ON stundennachweise FOR UPDATE
  USING (
    familie_profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (status IN ('approved','rejected'));

-- Admin
CREATE POLICY "admin_stunden"
  ON stundennachweise FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ---------------------------------------------------------
-- 3. Zahlungs-Log (denormalisiert für Buchhaltung)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS zahlungen_log (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stundennachweis_id    uuid REFERENCES stundennachweise(id) ON DELETE SET NULL,
  anbieter_id           uuid NOT NULL REFERENCES anbieter(id) ON DELETE RESTRICT,
  familie_profile_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  -- Beträge in Cent
  brutto_ct             int NOT NULL,   -- was Familie zahlt
  provision_ct          int NOT NULL,   -- 10 % für xcare
  netto_ct              int NOT NULL,   -- 90 % → Anbieter
  -- Stripe
  payment_intent_id     text NOT NULL,
  stripe_account_id     text NOT NULL,  -- acct_...
  stripe_charge_id      text,
  stripe_transfer_id    text,
  -- Status
  status                text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','succeeded','refunded','failed')),
  beschreibung          text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  paid_at               timestamptz
);

CREATE INDEX ON zahlungen_log (anbieter_id, created_at DESC);
CREATE INDEX ON zahlungen_log (familie_profile_id, created_at DESC);

ALTER TABLE zahlungen_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anbieter_view_zahlungen"
  ON zahlungen_log FOR SELECT
  USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
      JOIN profiles p ON p.id = a.profile_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "familie_view_zahlungen"
  ON zahlungen_log FOR SELECT
  USING (
    familie_profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admin_zahlungen"
  ON zahlungen_log FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ---------------------------------------------------------
-- 4. Trigger: updated_at on stripe_connect_accounts
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER stripe_connect_updated_at
  BEFORE UPDATE ON stripe_connect_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------
-- 5. Helper View: Anbieter Zahlungs-Übersicht
-- ---------------------------------------------------------
CREATE OR REPLACE VIEW anbieter_zahlungs_uebersicht AS
SELECT
  a.id AS anbieter_id,
  a.name AS anbieter_name,
  sca.stripe_account_id,
  sca.charges_enabled,
  sca.payouts_enabled,
  sca.onboarding_complete,
  COUNT(sn.id) FILTER (WHERE sn.status = 'pending')    AS stunden_pending,
  COUNT(sn.id) FILTER (WHERE sn.status = 'approved')   AS stunden_approved,
  COUNT(sn.id) FILTER (WHERE sn.status = 'paid')       AS stunden_paid,
  COALESCE(SUM(sn.betrag_ct) FILTER (WHERE sn.status = 'paid'), 0)   AS umsatz_ct,
  COALESCE(SUM(sn.betrag_ct) FILTER (WHERE sn.status = 'approved'), 0) AS offen_ct
FROM anbieter a
LEFT JOIN stripe_connect_accounts sca ON sca.anbieter_id = a.id
LEFT JOIN stundennachweise sn ON sn.anbieter_id = a.id
GROUP BY a.id, a.name, sca.stripe_account_id, sca.charges_enabled, sca.payouts_enabled, sca.onboarding_complete;

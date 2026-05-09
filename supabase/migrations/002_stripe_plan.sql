-- Migration 002: Stripe plan + subscription columns for anbieter
-- Adds plan gating and Stripe customer/subscription references

-- Plan enum
DO $$ BEGIN
  CREATE TYPE anbieter_plan AS ENUM ('free', 'starter', 'professional', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add plan and Stripe fields to anbieter table
ALTER TABLE anbieter
  ADD COLUMN IF NOT EXISTS plan anbieter_plan NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_anbieter_stripe_subscription
  ON anbieter (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_anbieter_stripe_customer
  ON anbieter (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- anbieter_team table (if not already created in migration 001)
CREATE TABLE IF NOT EXISTS anbieter_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anbieter_id UUID NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rolle TEXT NOT NULL DEFAULT 'mitarbeiter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (anbieter_id, profile_id)
);

-- RLS for anbieter_team
ALTER TABLE anbieter_team ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anbieter_team_select" ON anbieter_team;
CREATE POLICY "anbieter_team_select" ON anbieter_team
  FOR SELECT USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
        JOIN profiles p ON p.id = a.profile_id
        WHERE p.user_id = auth.uid()
    )
    OR profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "anbieter_team_manage" ON anbieter_team;
CREATE POLICY "anbieter_team_manage" ON anbieter_team
  FOR ALL USING (
    anbieter_id IN (
      SELECT a.id FROM anbieter a
        JOIN profiles p ON p.id = a.profile_id
        WHERE p.user_id = auth.uid()
    )
  );

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ui_modus text NOT NULL DEFAULT 'standard'
  CHECK (ui_modus IN ('senior', 'standard', 'profi', 'familie'));

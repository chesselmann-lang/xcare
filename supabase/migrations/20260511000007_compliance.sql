-- AVV-Tracking (Auftragsverarbeitungsverträge)
CREATE TABLE IF NOT EXISTS avv_partner (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  dienst text NOT NULL, -- z.B. "Supabase (Hosting)", "Vercel (Deployment)"
  avv_unterzeichnet boolean NOT NULL DEFAULT false,
  unterzeichnet_am date,
  naechste_pruefung date,
  notizen text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Nur Admins via service role / RLS: Admin-only
ALTER TABLE avv_partner ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avv_admin_only" ON avv_partner
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- DSGVO-Löschanfragen-Queue
CREATE TABLE IF NOT EXISTS dsgvo_loeschanfragen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profil_id uuid REFERENCES profiles(id),
  email text NOT NULL,
  status text NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'in_bearbeitung', 'erledigt', 'abgelehnt')),
  angefragt_am timestamptz NOT NULL DEFAULT now(),
  erledigt_am timestamptz,
  notizen text
);

ALTER TABLE dsgvo_loeschanfragen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loeschanfragen_admin" ON dsgvo_loeschanfragen
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Users können eigene Anfrage stellen:
CREATE POLICY "loeschanfragen_self_insert" ON dsgvo_loeschanfragen
  FOR INSERT WITH CHECK (profil_id = auth.uid());

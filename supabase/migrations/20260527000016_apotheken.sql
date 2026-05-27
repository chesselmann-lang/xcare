-- Apotheken table (German pharmacy directory)
CREATE TABLE IF NOT EXISTS public.apotheken (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  adresse text NOT NULL,
  plz text NOT NULL,
  ort text NOT NULL,
  bundesland text,
  telefon text,
  email text,
  webseite text,
  lat numeric(10,7),
  lng numeric(10,7),
  notdienst_aktiv boolean DEFAULT false,
  lieferservice boolean DEFAULT false,
  bote boolean DEFAULT false,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Medikament-Bestellungen
CREATE TABLE IF NOT EXISTS public.medikament_bestellungen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  apotheke_id uuid REFERENCES public.apotheken(id) ON DELETE SET NULL,
  medikament_name text NOT NULL,
  pzn text, -- Pharmazentralnummer
  menge integer DEFAULT 1,
  einheit text DEFAULT 'Packung',
  rezept_pflicht boolean DEFAULT false,
  rezept_bild_url text,
  status text DEFAULT 'ausstehend' CHECK (status IN ('ausstehend', 'bestaetigt', 'in_lieferung', 'geliefert', 'storniert')),
  liefer_adresse text,
  notizen text,
  bestellt_am timestamptz DEFAULT now(),
  geliefert_am timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Medikament-Erinnerungen (Einnahme-Reminder)
CREATE TABLE IF NOT EXISTS public.medikament_erinnerungen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  medikament_name text NOT NULL,
  pzn text,
  dosierung text,
  einnahme_zeiten jsonb DEFAULT '[]'::jsonb, -- ["08:00", "20:00"]
  tage jsonb DEFAULT '["mo","di","mi","do","fr","sa","so"]'::jsonb,
  aktiv boolean DEFAULT true,
  letzte_einnahme timestamptz,
  vorrat_einheiten integer,
  nachbestellung_ab integer DEFAULT 7, -- days of supply remaining
  apotheke_id uuid REFERENCES public.apotheken(id),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS apotheken_plz_idx ON public.apotheken(plz);
CREATE INDEX IF NOT EXISTS apotheken_notdienst_idx ON public.apotheken(notdienst_aktiv) WHERE notdienst_aktiv = true;
CREATE INDEX IF NOT EXISTS medikament_bestellungen_user_idx ON public.medikament_bestellungen(user_id);
CREATE INDEX IF NOT EXISTS medikament_erinnerungen_user_idx ON public.medikament_erinnerungen(user_id);

-- RLS
ALTER TABLE public.apotheken ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medikament_bestellungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medikament_erinnerungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apotheken_public_read" ON public.apotheken FOR SELECT USING (true);
CREATE POLICY "bestellungen_own" ON public.medikament_bestellungen FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "erinnerungen_own" ON public.medikament_erinnerungen FOR ALL USING (auth.uid() = user_id);

-- Seed some pharmacies for demo
INSERT INTO public.apotheken (name, adresse, plz, ort, bundesland, telefon, lat, lng, lieferservice, notdienst_aktiv, verified) VALUES
  ('Apotheke am Kurfuerstendamm', 'Kurfuerstendamm 42', '10719', 'Berlin', 'Berlin', '030 8812340', 52.5037, 13.3253, true, false, true),
  ('Adler Apotheke Mitte', 'Unter den Linden 21', '10117', 'Berlin', 'Berlin', '030 2045678', 52.5170, 13.3888, true, true, true),
  ('Stadt-Apotheke Hamburg', 'Moenckebergstrasse 7', '20095', 'Hamburg', 'Hamburg', '040 3245678', 53.5503, 10.0008, true, false, true),
  ('Marien-Apotheke Muenchen', 'Marienplatz 8', '80331', 'Muenchen', 'Bayern', '089 2904560', 48.1372, 11.5753, false, false, true),
  ('Dom-Apotheke Koeln', 'Domkloster 3', '50667', 'Koeln', 'NRW', '0221 2578901', 50.9413, 6.9583, true, true, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- F27: Angehörigen-Entlastung & Selbsthilfegruppen-Finder
-- ============================================================

-- Self-help groups catalog
CREATE TABLE IF NOT EXISTS public.selbsthilfegruppen (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  typ              TEXT CHECK (typ IN ('praesenz','online','hybrid')) DEFAULT 'praesenz',
  thema            TEXT NOT NULL,
  beschreibung     TEXT,
  plz              TEXT,
  ort              TEXT,
  bundesland       TEXT,
  treffen_rhythmus TEXT,
  kontakt_email    TEXT,
  kontakt_telefon  TEXT,
  webseite         TEXT,
  veranstalter     TEXT,
  aktiv            BOOLEAN DEFAULT true,
  erstellt_am      TIMESTAMPTZ DEFAULT now()
);

-- User burnout screening results (Zarit Burden Interview)
CREATE TABLE IF NOT EXISTS public.burnout_screenings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  antworten        JSONB NOT NULL,
  gesamt_score     INT NOT NULL CHECK (gesamt_score BETWEEN 0 AND 88),
  belastungsstufe  TEXT CHECK (belastungsstufe IN ('niedrig','moderat','hoch','sehr_hoch')),
  empfehlungen     JSONB,
  erstellt_am      TIMESTAMPTZ DEFAULT now()
);

-- Verhinderungspflege planning (§39 SGB XI)
CREATE TABLE IF NOT EXISTS public.verhinderungspflege (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pflegegrad         INT CHECK (pflegegrad BETWEEN 2 AND 5),
  jahres_budget_cent INT DEFAULT 161200,
  eingesetzt_cent    INT DEFAULT 0,
  planung            JSONB,
  notizen            TEXT,
  erstellt_am        TIMESTAMPTZ DEFAULT now(),
  aktualisiert_am    TIMESTAMPTZ DEFAULT now()
);

-- Entlastungsbetrag §45b tracking
CREATE TABLE IF NOT EXISTS public.entlastungsbetrag_ausgaben (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  monat           DATE NOT NULL,
  leistung        TEXT NOT NULL,
  anbieter        TEXT,
  betrag_cent     INT NOT NULL,
  erstattet_cent  INT,
  anerkannt       BOOLEAN DEFAULT false,
  erstellt_am     TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_selbsthilfegruppen_typ   ON public.selbsthilfegruppen(typ);
CREATE INDEX IF NOT EXISTS idx_selbsthilfegruppen_plz   ON public.selbsthilfegruppen(plz);
CREATE INDEX IF NOT EXISTS idx_selbsthilfegruppen_thema ON public.selbsthilfegruppen(thema);
CREATE INDEX IF NOT EXISTS idx_burnout_user_id          ON public.burnout_screenings(user_id);
CREATE INDEX IF NOT EXISTS idx_burnout_erstellt_am      ON public.burnout_screenings(erstellt_am DESC);
CREATE INDEX IF NOT EXISTS idx_verhinderung_user_id     ON public.verhinderungspflege(user_id);
CREATE INDEX IF NOT EXISTS idx_entlastung_user_monat    ON public.entlastungsbetrag_ausgaben(user_id, monat);

-- Trigger: keep aktualisiert_am up to date on verhinderungspflege
CREATE OR REPLACE FUNCTION public.verhinderung_set_aktualisiert_am()
RETURNS TRIGGER AS $$
BEGIN
  NEW.aktualisiert_am = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_verhinderungspflege_aktualisiert_am
  BEFORE UPDATE ON public.verhinderungspflege
  FOR EACH ROW EXECUTE FUNCTION public.verhinderung_set_aktualisiert_am();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.selbsthilfegruppen         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.burnout_screenings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verhinderungspflege        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entlastungsbetrag_ausgaben ENABLE ROW LEVEL SECURITY;

-- selbsthilfegruppen: public read
CREATE POLICY "shg_public_select" ON public.selbsthilfegruppen
  FOR SELECT USING (aktiv = true);

-- burnout_screenings: owner only
CREATE POLICY "burnout_own_select" ON public.burnout_screenings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "burnout_own_insert" ON public.burnout_screenings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "burnout_own_delete" ON public.burnout_screenings
  FOR DELETE USING (auth.uid() = user_id);

-- verhinderungspflege: owner only
CREATE POLICY "verhinderung_own_select" ON public.verhinderungspflege
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "verhinderung_own_insert" ON public.verhinderungspflege
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "verhinderung_own_update" ON public.verhinderungspflege
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "verhinderung_own_delete" ON public.verhinderungspflege
  FOR DELETE USING (auth.uid() = user_id);

-- entlastungsbetrag_ausgaben: owner only
CREATE POLICY "entlastung_own_select" ON public.entlastungsbetrag_ausgaben
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "entlastung_own_insert" ON public.entlastungsbetrag_ausgaben
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "entlastung_own_update" ON public.entlastungsbetrag_ausgaben
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "entlastung_own_delete" ON public.entlastungsbetrag_ausgaben
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Seed: 10 Selbsthilfegruppen (mix Präsenz + Online + Hybrid)
-- ============================================================

INSERT INTO public.selbsthilfegruppen
  (name, typ, thema, beschreibung, plz, ort, bundesland, treffen_rhythmus, kontakt_email, webseite, veranstalter)
VALUES
  (
    'Demenz-Angehörige Berlin',
    'praesenz',
    'Demenz',
    'Offene Gesprächsgruppe für Angehörige von Menschen mit Demenz. Gegenseitiger Erfahrungsaustausch, Information zu Unterstützungsangeboten und emotionaler Halt in einer vertraulichen Atmosphäre.',
    '10115',
    'Berlin',
    'Berlin',
    'Jeden 1. Montag im Monat 17:00 Uhr',
    'info@alzheimer-berlin.de',
    'https://www.alzheimer-berlin.de',
    'Alzheimer Gesellschaft Berlin e.V.'
  ),
  (
    'Pflegende Angehörige Hamburg',
    'praesenz',
    'Allgemeine Pflege',
    'Offene Gruppe für alle, die einen nahestehenden Menschen pflegen – unabhängig vom Krankheitsbild. Austausch, Entlastung, gegenseitige Vernetzung.',
    '20095',
    'Hamburg',
    'Hamburg',
    'Jeden Mittwoch 18:30 Uhr',
    'beratung@pflege-hamburg.de',
    'https://www.pflege-hamburg.de',
    'Pflegestützpunkt Hamburg Mitte'
  ),
  (
    'Online-Gruppe: Pflegende Angehörige',
    'online',
    'Allgemeine Pflege',
    'Bundesweite Online-Selbsthilfegruppe für pflegende Angehörige per Videokonferenz. Diskret, kostenlos und ohne formelle Anmeldung – einfach zuschalten.',
    NULL,
    NULL,
    NULL,
    'Jeden Dienstag 19:00 Uhr per Zoom',
    'online@angehoerige-pflege.de',
    'https://www.angehoerige-pflege.de/online-gruppe',
    'Bundesverband pflegender Angehöriger e.V.'
  ),
  (
    'Schlaganfall-Angehörige München',
    'praesenz',
    'Schlaganfall',
    'Selbsthilfegruppe für Angehörige von Schlaganfallpatienten. Offenes Gespräch über die Herausforderungen in Pflege und Rehabilitation.',
    '80331',
    'München',
    'Bayern',
    'Jeden 2. und 4. Donnerstag 16:00 Uhr',
    'kontakt@schlaganfall-muenchen.de',
    'https://www.schlaganfall-muenchen.de',
    'Selbsthilfezentrum München'
  ),
  (
    'Caregiver Support Group (English)',
    'online',
    'Allgemeine Pflege',
    'English-language support group for international caregivers in Germany. Share your experiences and find support in a welcoming, open environment.',
    NULL,
    NULL,
    NULL,
    'Every Monday 18:00 via Zoom',
    'support@caregiver-germany.de',
    'https://www.caregiver-germany.de',
    'Internationale Pflegehilfe Deutschland'
  ),
  (
    'Angehörige von Menschen mit MS',
    'hybrid',
    'MS',
    'Selbsthilfegruppe für Angehörige von MS-Erkrankten. Treffen finden wechselweise in Präsenz und online statt. Themen: Alltagsbewältigung, Pflegetipps, emotionale Unterstützung.',
    '60313',
    'Frankfurt am Main',
    'Hessen',
    'Jeden 1. Samstag 10:00 Uhr (alternierend Präsenz/Online)',
    'kontakt@ms-hessen.de',
    'https://www.dmsg-hessen.de',
    'Deutsche Multiple Sklerose Gesellschaft Hessen e.V.'
  ),
  (
    'Parkinson-Selbsthilfe NRW',
    'praesenz',
    'Parkinson',
    'Regionale Gruppe für Angehörige von Parkinson-Patienten in NRW. Information, Begleitung und gegenseitige Unterstützung im Pflegealltag.',
    '50667',
    'Köln',
    'Nordrhein-Westfalen',
    'Jeden 3. Mittwoch im Monat 17:30 Uhr',
    'nrw@parkinson-vereinigung.de',
    'https://www.parkinson-vereinigung.de',
    'Deutsche Parkinson Vereinigung e.V. – Regionalgruppe Köln'
  ),
  (
    'Junge Pflegende (unter 40)',
    'online',
    'Allgemeine Pflege',
    'Speziell für jüngere Pflegende unter 40 Jahren, die Beruf, eigene Familie und Pflegeaufgaben unter einen Hut bringen müssen. Niedrigschwellig, anonym, kostenfrei.',
    NULL,
    NULL,
    NULL,
    'Jeden Donnerstag 20:00 Uhr per Zoom',
    'info@junge-pflegende.de',
    'https://www.junge-pflegende.de',
    'Initiative Junge Pflegende Deutschland'
  ),
  (
    'Pflegende Angehörige Österreich (DACH)',
    'online',
    'Allgemeine Pflege',
    'Grenzüberschreitende Online-Gruppe für den gesamten DACH-Raum (Deutschland, Österreich, Schweiz). Offener Austausch auf Deutsch, alle Pflegesituationen willkommen.',
    NULL,
    NULL,
    NULL,
    'Jeden 2. Samstag 15:00 Uhr per Zoom',
    'dach@pflegende-angehoerige.at',
    'https://www.pflegende-angehoerige.at',
    'Österreichisches Rotes Kreuz – Pflegeberatung'
  ),
  (
    'Angehörige psychiatrisch Erkrankter',
    'praesenz',
    'Psychiatrie',
    'Selbsthilfegruppe für Familienmitglieder und Angehörige von Menschen mit psychischer Erkrankung. Einfühlsam, vertraulich und offen für alle Betroffenen.',
    '04103',
    'Leipzig',
    'Sachsen',
    'Jeden Dienstag 18:00 Uhr',
    'kontakt@bapk-sachsen.de',
    'https://www.bapk.de',
    'Bundesverband der Angehörigen psychisch erkrankter Menschen e.V.'
  );

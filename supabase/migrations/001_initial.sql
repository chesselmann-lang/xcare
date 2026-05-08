-- ============================================================
-- xcare — Initiale Datenbankstruktur
-- Migration: 001_initial.sql
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Volltextsuche

-- ============================================================
-- PROFILES (User-Erweiterung)
-- ============================================================
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('familie', 'anbieter', 'admin')) DEFAULT 'familie',
  vorname       TEXT,
  nachname      TEXT,
  email         TEXT NOT NULL,
  telefon       TEXT,
  plz           TEXT,
  ort           TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ============================================================
-- ANBIETER (Sozialdienstleister)
-- ============================================================
CREATE TABLE public.anbieter (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  beschreibung  TEXT,
  traeger       TEXT, -- gGmbH, e.V., GmbH, etc.
  strasse       TEXT,
  plz           TEXT,
  ort           TEXT,
  geo           GEOGRAPHY(Point, 4326), -- PostGIS
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  telefon       TEXT,
  email         TEXT,
  website       TEXT,
  logo_url      TEXT,
  verifiziert   BOOLEAN NOT NULL DEFAULT false,
  aktiv         BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Geodaten-Index
CREATE INDEX idx_anbieter_geo ON public.anbieter USING GIST(geo);
CREATE INDEX idx_anbieter_plz ON public.anbieter (plz);
CREATE INDEX idx_anbieter_aktiv ON public.anbieter (aktiv) WHERE aktiv = true;

-- ============================================================
-- LEISTUNGEN (Angebote der Anbieter)
-- ============================================================
CREATE TABLE public.leistungen (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anbieter_id       UUID NOT NULL REFERENCES public.anbieter(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  beschreibung      TEXT,
  kategorie         TEXT NOT NULL,
  lebenslage        TEXT[] DEFAULT '{}',
  sgb_paragraf      TEXT,
  kostentraeger     TEXT[] DEFAULT '{}',
  preis_von         DECIMAL(10,2),
  preis_bis         DECIMAL(10,2),
  kapazitaet        INTEGER,
  wartezeit_wochen  INTEGER,
  aktiv             BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leistungen_anbieter ON public.leistungen (anbieter_id);
CREATE INDEX idx_leistungen_kategorie ON public.leistungen (kategorie);
CREATE INDEX idx_leistungen_lebenslage ON public.leistungen USING GIN(lebenslage);

-- ============================================================
-- ANFRAGEN (Familien → Anbieter)
-- ============================================================
CREATE TABLE public.anfragen (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  familie_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leistung_id     UUID REFERENCES public.leistungen(id) ON DELETE SET NULL,
  anbieter_id     UUID REFERENCES public.anbieter(id) ON DELETE SET NULL,
  lebenslage      TEXT NOT NULL,
  beschreibung    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'offen'
                  CHECK (status IN ('offen','in_bearbeitung','angeboten','bestaetigt','abgelehnt','abgeschlossen')),
  ki_empfehlung   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_anfragen_familie ON public.anfragen (familie_id);
CREATE INDEX idx_anfragen_anbieter ON public.anfragen (anbieter_id);
CREATE INDEX idx_anfragen_status ON public.anfragen (status);

-- ============================================================
-- FAVORITEN (Familien speichern Anbieter)
-- ============================================================
CREATE TABLE public.favoriten (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  familie_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  anbieter_id UUID NOT NULL REFERENCES public.anbieter(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (familie_id, anbieter_id)
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Eigenes Profil lesen" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Eigenes Profil aktualisieren" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anbieter-Profile öffentlich lesen" ON public.profiles
  FOR SELECT USING (role = 'anbieter');

-- Anbieter
ALTER TABLE public.anbieter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anbieter öffentlich lesen" ON public.anbieter
  FOR SELECT USING (aktiv = true);

CREATE POLICY "Eigenen Anbieter verwalten" ON public.anbieter
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Leistungen
ALTER TABLE public.leistungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leistungen öffentlich lesen" ON public.leistungen
  FOR SELECT USING (aktiv = true);

CREATE POLICY "Eigene Leistungen verwalten" ON public.leistungen
  FOR ALL USING (
    anbieter_id IN (
      SELECT a.id FROM public.anbieter a
      JOIN public.profiles p ON a.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Anfragen
ALTER TABLE public.anfragen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Familie sieht eigene Anfragen" ON public.anfragen
  FOR SELECT USING (
    familie_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anbieter sieht eigene Anfragen" ON public.anfragen
  FOR SELECT USING (
    anbieter_id IN (
      SELECT a.id FROM public.anbieter a
      JOIN public.profiles p ON a.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Familie erstellt Anfragen" ON public.anfragen
  FOR INSERT WITH CHECK (
    familie_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anbieter aktualisiert Anfragen-Status" ON public.anfragen
  FOR UPDATE USING (
    anbieter_id IN (
      SELECT a.id FROM public.anbieter a
      JOIN public.profiles p ON a.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Favoriten
ALTER TABLE public.favoriten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Familie verwaltet Favoriten" ON public.favoriten
  FOR ALL USING (
    familie_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- TRIGGER: Profil bei Registrierung anlegen
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, vorname, nachname, role, plz)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'vorname',
    NEW.raw_user_meta_data->>'nachname',
    COALESCE(NEW.raw_user_meta_data->>'rolle', 'familie'),
    NEW.raw_user_meta_data->>'plz'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER: updated_at automatisch setzen
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_anbieter_updated_at
  BEFORE UPDATE ON public.anbieter
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_anfragen_updated_at
  BEFORE UPDATE ON public.anfragen
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- FUNKTION: Geo-Suche (Anbieter im Umkreis)
-- ============================================================
CREATE OR REPLACE FUNCTION public.anbieter_im_umkreis(
  lat_eingabe  DOUBLE PRECISION,
  lng_eingabe  DOUBLE PRECISION,
  radius_km    DOUBLE PRECISION DEFAULT 20
)
RETURNS TABLE (
  id           UUID,
  name         TEXT,
  plz          TEXT,
  ort          TEXT,
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  entfernung_m DOUBLE PRECISION,
  verifiziert  BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.plz,
    a.ort,
    a.lat,
    a.lng,
    ST_Distance(
      a.geo::geography,
      ST_SetSRID(ST_MakePoint(lng_eingabe, lat_eingabe), 4326)::geography
    ) AS entfernung_m,
    a.verifiziert
  FROM public.anbieter a
  WHERE
    a.aktiv = true
    AND a.geo IS NOT NULL
    AND ST_DWithin(
      a.geo::geography,
      ST_SetSRID(ST_MakePoint(lng_eingabe, lat_eingabe), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY entfernung_m;
END;
$$ LANGUAGE plpgsql STABLE;

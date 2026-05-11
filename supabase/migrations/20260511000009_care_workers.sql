-- ============================================
-- Migration: 20260511000009_care_workers
-- Phase 5B: Care-Worker Vollprofil + PostGIS Geo-Suche
-- Stores individual care worker profiles linked to an Anbieter.
-- PostGIS geometry column for ST_DWithin radius queries.
-- ============================================

-- Enable PostGIS if not already active (idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;

-- -----------------------------------------------
-- care_workers — individuelle Pflegekraft-Profile
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS care_workers (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  anbieter_id           uuid NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  -- Persönliche Daten
  vorname               text NOT NULL,
  nachname              text NOT NULL,
  geburtsjahr           smallint,
  sprachen              text[]  DEFAULT '{}',
  -- Qualifikationen
  qualifikationen       text[]  DEFAULT '{}',   -- z.B. ['Altenpfleger', 'Palliativpflege']
  zertifikate           text[]  DEFAULT '{}',   -- Freitext-Labels
  -- Erfahrung & Konditionen
  berufserfahrung_jahre smallint,
  stundensatz_ct        integer NOT NULL DEFAULT 0 CHECK (stundensatz_ct >= 0), -- Cent
  verfuegbar_ab         date,
  max_stunden_woche     smallint,
  -- Führungszeugnis
  fuehrungszeugnis_vorhanden boolean NOT NULL DEFAULT false,
  fuehrungszeugnis_datum     date,
  -- Bio / Vorstellung
  bio                   text,
  -- Verfügbarkeit
  abwesend_bis          date,
  -- Geo (PostGIS point: longitude, latitude, SRID 4326)
  standort              geography(Point, 4326),
  plz                   char(5),
  ort                   text,
  -- Status
  aktiv                 boolean NOT NULL DEFAULT true,
  -- Timestamps
  created_at            timestamptz DEFAULT now() NOT NULL,
  updated_at            timestamptz DEFAULT now() NOT NULL
);

-- Spatial index for fast ST_DWithin queries
CREATE INDEX IF NOT EXISTS idx_care_workers_standort
  ON care_workers USING GIST (standort);

-- Regular indexes
CREATE INDEX IF NOT EXISTS idx_care_workers_anbieter
  ON care_workers(anbieter_id);
CREATE INDEX IF NOT EXISTS idx_care_workers_aktiv
  ON care_workers(aktiv, stundensatz_ct);
CREATE INDEX IF NOT EXISTS idx_care_workers_plz
  ON care_workers(plz);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_care_workers_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_care_workers_updated_at ON care_workers;
CREATE TRIGGER trg_care_workers_updated_at
  BEFORE UPDATE ON care_workers
  FOR EACH ROW EXECUTE FUNCTION update_care_workers_updated_at();

-- -----------------------------------------------
-- RLS
-- -----------------------------------------------
ALTER TABLE care_workers ENABLE ROW LEVEL SECURITY;

-- Public can read active workers
CREATE POLICY "care_workers_public_read" ON care_workers
  FOR SELECT USING (aktiv = true);

-- Anbieter can manage their own workers
CREATE POLICY "care_workers_anbieter_manage" ON care_workers
  FOR ALL
  USING (
    anbieter_id IN (
      SELECT id FROM anbieter WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    anbieter_id IN (
      SELECT id FROM anbieter WHERE user_id = auth.uid()
    )
  );

-- Admins can read all
CREATE POLICY "care_workers_admin_read" ON care_workers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- -----------------------------------------------
-- care_worker_anfragen — Direktanfragen an einzelne Workers
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS care_worker_anfragen (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  care_worker_id  uuid NOT NULL REFERENCES care_workers(id) ON DELETE CASCADE,
  familie_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  anbieter_id     uuid NOT NULL REFERENCES anbieter(id) ON DELETE CASCADE,
  nachricht       text,
  status          text NOT NULL DEFAULT 'offen'
                  CHECK (status IN ('offen','bestaetigt','abgelehnt','abgeschlossen')),
  stunden_pro_woche smallint,
  start_datum     date,
  created_at      timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE care_worker_anfragen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cwa_familie_own" ON care_worker_anfragen
  FOR ALL USING (familie_id = auth.uid()) WITH CHECK (familie_id = auth.uid());

CREATE POLICY "cwa_anbieter_own" ON care_worker_anfragen
  FOR ALL USING (
    anbieter_id IN (SELECT id FROM anbieter WHERE user_id = auth.uid())
  )
  WITH CHECK (
    anbieter_id IN (SELECT id FROM anbieter WHERE user_id = auth.uid())
  );

-- -----------------------------------------------
-- PostGIS RPC: suche_care_workers_geo
-- Called by /api/care-workers GET with lat/lng params.
-- Returns workers within p_radius_m metres, ordered by distance.
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION suche_care_workers_geo(
  p_lat              double precision,
  p_lng              double precision,
  p_radius_m         double precision DEFAULT 25000,
  p_qualifikation    text             DEFAULT NULL,
  p_sprache          text             DEFAULT NULL,
  p_max_stundensatz  integer          DEFAULT NULL,
  p_verfuegbar_ab    text             DEFAULT NULL,
  p_fuehrungszeugnis boolean         DEFAULT NULL,
  p_limit            integer          DEFAULT 20,
  p_offset           integer          DEFAULT 0
)
RETURNS TABLE (
  id                    uuid,
  vorname               text,
  nachname              text,
  sprachen              text[],
  qualifikationen       text[],
  zertifikate           text[],
  berufserfahrung_jahre smallint,
  stundensatz_ct        integer,
  verfuegbar_ab         date,
  max_stunden_woche     smallint,
  fuehrungszeugnis_vorhanden boolean,
  bio                   text,
  plz                   char(5),
  ort                   text,
  entfernung_m          double precision,
  anbieter_id           uuid,
  anbieter_name         text,
  anbieter_logo_url     text,
  anbieter_verifiziert  boolean
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    cw.id,
    cw.vorname,
    cw.nachname,
    cw.sprachen,
    cw.qualifikationen,
    cw.zertifikate,
    cw.berufserfahrung_jahre,
    cw.stundensatz_ct,
    cw.verfuegbar_ab,
    cw.max_stunden_woche,
    cw.fuehrungszeugnis_vorhanden,
    cw.bio,
    cw.plz,
    cw.ort,
    ST_Distance(
      cw.standort,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS entfernung_m,
    a.id    AS anbieter_id,
    a.name  AS anbieter_name,
    a.logo_url AS anbieter_logo_url,
    a.verifiziert AS anbieter_verifiziert
  FROM care_workers cw
  JOIN anbieter a ON a.id = cw.anbieter_id
  WHERE
    cw.aktiv = true
    AND (cw.abwesend_bis IS NULL OR cw.abwesend_bis < CURRENT_DATE)
    AND (
      cw.standort IS NULL
      OR ST_DWithin(
           cw.standort,
           ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
           p_radius_m
         )
    )
    AND (p_qualifikation IS NULL OR cw.qualifikationen @> ARRAY[p_qualifikation])
    AND (p_sprache IS NULL OR cw.sprachen @> ARRAY[p_sprache])
    AND (p_max_stundensatz IS NULL OR cw.stundensatz_ct <= p_max_stundensatz)
    AND (p_fuehrungszeugnis IS NULL OR cw.fuehrungszeugnis_vorhanden = p_fuehrungszeugnis)
    AND (
      p_verfuegbar_ab IS NULL
      OR cw.verfuegbar_ab IS NULL
      OR cw.verfuegbar_ab <= p_verfuegbar_ab::date
    )
  ORDER BY entfernung_m ASC NULLS LAST, cw.stundensatz_ct ASC
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION suche_care_workers_geo TO authenticated, anon;

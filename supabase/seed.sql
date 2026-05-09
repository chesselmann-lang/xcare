-- ============================================================
-- xcare — Seed-Daten für Entwicklung & Pilot
-- ============================================================

-- Beispiel-Anbieter (München)
INSERT INTO public.anbieter (id, profile_id, name, beschreibung, traeger, strasse, plz, ort, lat, lng, telefon, email, website, verifiziert, aktiv)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001', -- Platzhalter
    'Ambulante Pflege München-Mitte GmbH',
    'Wir bieten professionelle ambulante Pflege nach SGB XI für alle Pflegegrade.',
    'GmbH',
    'Marienplatz 1',
    '80331',
    'München',
    48.1351,
    11.5820,
    '089 12345678',
    'kontakt@pflege-muenchen.de',
    'https://pflege-muenchen.de',
    true,
    true
  );

-- Leistungen für den Beispiel-Anbieter
INSERT INTO public.leistungen (anbieter_id, name, beschreibung, kategorie, lebenslage, sgb_paragraf, kostentraeger)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Ambulante Grundpflege',
    'Körperpflege, Mobilität, Ernährung für Pflegegrad 1–5.',
    'pflege_ambulant',
    ARRAY['alter_pflege', 'krankheit_genesung'],
    'SGB XI §36',
    ARRAY['sgb_xi']
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'Haushaltshilfe & Betreuung',
    'Unterstützung im Alltag, Begleitung zu Terminen.',
    'haushaltshilfe',
    ARRAY['alter_pflege', 'erwerbsleben_vereinbarkeit'],
    'SGB XI §45b',
    ARRAY['sgb_xi', 'selbstzahler']
  );

-- GEO-Update für Anbieter (PostGIS)
UPDATE public.anbieter
SET geo = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
WHERE lat IS NOT NULL AND lng IS NOT NULL;

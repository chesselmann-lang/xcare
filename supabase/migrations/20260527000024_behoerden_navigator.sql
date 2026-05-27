-- F30: Sozialdienst-Lotse & Behörden-Navigator
-- Catalog of social benefits with application info
CREATE TABLE IF NOT EXISTS sozialleistungen (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  kurzname                TEXT,
  rechtsgrundlage         TEXT NOT NULL,
  behoerde                TEXT NOT NULL,
  beschreibung            TEXT,
  anspruchsvoraussetzungen TEXT[],
  leistungshoehe          TEXT,
  antragstellungsort      TEXT,
  bearbeitungszeit_wochen INT,
  widerspruchsfrist_wochen INT DEFAULT 4,
  formulare               JSONB,
  tipps                   TEXT[],
  haeufige_fehler         TEXT[],
  kategorie               TEXT CHECK (kategorie IN (
    'pflege','sozialhilfe','rente','gesundheit',
    'wohnen','arbeit','behinderung','kinder','sonstiges'
  )),
  prioritaet              INT DEFAULT 5,
  aktiv                   BOOLEAN DEFAULT true,
  erstellt_am             TIMESTAMPTZ DEFAULT now()
);

-- User's tracked applications
CREATE TABLE IF NOT EXISTS behoerden_vorgaenge (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  leistung_id           UUID REFERENCES sozialleistungen(id),
  leistung_name         TEXT NOT NULL,
  status                TEXT CHECK (status IN (
    'geplant','antrag_vorbereiten','eingereicht','nachforderung',
    'bewilligt','abgelehnt','widerspruch','klage','erledigt'
  )) DEFAULT 'geplant',
  behoerde              TEXT,
  eingereicht_am        DATE,
  bescheid_erwartet_am  DATE,
  bescheid_erhalten_am  DATE,
  widerspruchsfrist_am  DATE,
  betrag_bewilligt_cent INT,
  aktenzeichen          TEXT,
  notizen               TEXT,
  dokumente             JSONB,
  erinnerungen          JSONB,
  erstellt_am           TIMESTAMPTZ DEFAULT now(),
  aktualisiert_am       TIMESTAMPTZ DEFAULT now()
);

-- Behörden directory
CREATE TABLE IF NOT EXISTS behoerden_verzeichnis (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  typ               TEXT NOT NULL,
  plz               TEXT,
  ort               TEXT,
  strasse           TEXT,
  telefon           TEXT,
  email             TEXT,
  webseite          TEXT,
  oeffnungszeiten   TEXT,
  zustaendig_fuer   TEXT[],
  erstellt_am       TIMESTAMPTZ DEFAULT now()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE sozialleistungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE behoerden_vorgaenge ENABLE ROW LEVEL SECURITY;
ALTER TABLE behoerden_verzeichnis ENABLE ROW LEVEL SECURITY;

-- Public read for catalog tables
CREATE POLICY "sozialleistungen_public_read"
  ON sozialleistungen FOR SELECT
  USING (aktiv = true);

CREATE POLICY "behoerden_verzeichnis_public_read"
  ON behoerden_verzeichnis FOR SELECT
  USING (true);

-- User-scoped Vorgaenge
CREATE POLICY "vorgaenge_select_own"
  ON behoerden_vorgaenge FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "vorgaenge_insert_own"
  ON behoerden_vorgaenge FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vorgaenge_update_own"
  ON behoerden_vorgaenge FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "vorgaenge_delete_own"
  ON behoerden_vorgaenge FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Trigger: aktualisiert_am ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_behoerden_vorgaenge_aktualisiert_am()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.aktualisiert_am = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER behoerden_vorgaenge_updated_at
  BEFORE UPDATE ON behoerden_vorgaenge
  FOR EACH ROW EXECUTE FUNCTION update_behoerden_vorgaenge_aktualisiert_am();

-- ─── Seed: Sozialleistungen ───────────────────────────────────────────────────

INSERT INTO sozialleistungen
  (name, kurzname, rechtsgrundlage, behoerde, beschreibung,
   anspruchsvoraussetzungen, leistungshoehe, antragstellungsort,
   bearbeitungszeit_wochen, widerspruchsfrist_wochen, tipps, haeufige_fehler,
   kategorie, prioritaet)
VALUES

-- 1. Pflegegeld
(
  'Pflegegeld', 'Pflegegeld §37',
  '§37 SGB XI', 'Pflegekasse',
  'Monatlicher Geldbetrag fuer haeusliche Pflege durch Angehoerige oder Ehrenamtliche statt Pflegedienst.',
  ARRAY['Pflegegrad 2, 3, 4 oder 5', 'Haeusliche Pflege (kein vollstationaeres Heim)', 'Ausreichend sichergestellte Grundpflege nachgewiesen'],
  'PG 2: 332 EUR | PG 3: 573 EUR | PG 4: 765 EUR | PG 5: 947 EUR/Monat',
  'Schriftlich bei der zustaendigen Pflegekasse',
  5, 4,
  ARRAY['Antrag sofort stellen - Leistungen gelten ab Antragsdatum', 'Kombination mit Sachleistungen als Kombinationsleistung moeglich', 'Halbjährlicher Beratungsbesuch durch Pflegedienst nachweisen (PG 2+3: 1x/6 Monate, PG 4+5: 1x/3 Monate)'],
  ARRAY['Antrag zu spaet gestellt - kein rueckwirkender Anspruch', 'Beratungsbesuch vergessen - fuehrt zur Einstellung des Pflegegeldes', 'Pflegegrad noch nicht beantragt'],
  'pflege', 1
),

-- 2. Pflegesachleistungen
(
  'Pflegesachleistungen', 'Sachleistungen §36',
  '§36 SGB XI', 'Pflegekasse',
  'Abrechnung von ambulanten Pflegedienstleistungen direkt mit der Pflegekasse fuer koerperbezogene Pflege, Betreuung und hauswirtschaftliche Versorgung.',
  ARRAY['Pflegegrad 2-5', 'Haeusliche Pflege', 'Zugelassener ambulanter Pflegedienst'],
  'PG 2: bis 724 EUR | PG 3: bis 1.363 EUR | PG 4: bis 1.693 EUR | PG 5: bis 2.095 EUR/Monat',
  'Schriftlich bei der Pflegekasse + Vertrag mit zugelassenem Pflegedienst',
  4, 4,
  ARRAY['Pflegedienst muss Kassenzulassung haben', 'Nicht verbrauchte Betraege verfallen (kein Uebertrag)', 'Kombination mit Pflegegeld als Kombinationsleistung moeglich'],
  ARRAY['Pflegedienst ohne Kassenzulassung gewaehlt', 'Sachleistungsbetrag ueberschritten ohne Genehmigung'],
  'pflege', 2
),

-- 3. Verhinderungspflege
(
  'Verhinderungspflege', 'Verhinderungspflege §39',
  '§39 SGB XI', 'Pflegekasse',
  'Uebernahme der Kosten, wenn die Pflegeperson verhindert ist (Urlaub, Krankheit) fuer Ersatzpflegeperson oder Pflegedienst.',
  ARRAY['Pflegegrad 2-5', 'Pflegeperson hat in den letzten 6 Monaten gepflegt', 'Verhinderung der Pflegeperson (Urlaub, Krankheit etc.)'],
  'Bis 1.612 EUR/Jahr, max. 42 Tage (erweiterbar durch Entlastungsbetrag-Umwidmung auf bis zu 2.418 EUR)',
  'Schriftlich bei der Pflegekasse mit Nachweis der Verhinderung',
  3, 4,
  ARRAY['Beantragen Sie die Leistung VOR Antritt der Verhinderung', 'Kurzzeitpflege-Budget kann zur Haelfte auf Verhinderungspflege uebertragen werden', 'Verwandte bis 2. Grades erhalten nur Pflegegeldersatz, keine vollen Kosten'],
  ARRAY['Kein Nachweis der vorherigen Pflegetaetigkeit', 'Angehoerige 1./2. Grades als nahe Angehoerige falsch eingestuft'],
  'pflege', 3
),

-- 4. Kurzzeitpflege
(
  'Kurzzeitpflege', 'Kurzzeitpflege §42',
  '§42 SGB XI', 'Pflegekasse',
  'Voruebergehende vollstationaere Pflege z.B. nach Krankenhausaufenthalt oder wenn haeusliche Pflege kurzfristig nicht moeglich ist.',
  ARRAY['Pflegegrad 2-5', 'Haeusliche Pflege zeitweise nicht moeglich', 'Stationaere Einrichtung mit Kurzzeitpflege-Zulassung'],
  'Bis 1.774 EUR/Jahr, max. 56 Tage (erweiterbar auf bis zu 3.386 EUR durch Verhinderungspflege-Budget)',
  'Schriftlich bei der Pflegekasse vor oder kurz nach Beginn der Kurzzeitpflege',
  2, 4,
  ARRAY['Unbedingt vor Beginn oder spaetestens 1 Woche danach beantragen', 'Budget kann auf Verhinderungspflege uebertragen werden (50%)', 'Eigenanteil (Unterkunft/Verpflegung) wird nicht von Pflegekasse uebernommen - ggf. Sozialhilfe beantragen'],
  ARRAY['Zu spaet beantragt', 'Einrichtung ohne Kurzzeitpflege-Zulassung gewaehlt', 'Eigenanteil nicht eingeplant'],
  'pflege', 4
),

-- 5. Entlastungsbetrag
(
  'Entlastungsbetrag', 'Entlastungsbetrag §45b',
  '§45b SGB XI', 'Pflegekasse',
  'Monatlicher Betrag fuer anerkannte Entlastungsangebote: Betreuungsdienste, Alltagsbegleitung, hauswirtschaftliche Versorgung, Nachbarschaftshilfe.',
  ARRAY['Pflegegrad 1-5', 'Haeusliche Pflege', 'Anerkannter Entlastungsanbieter (landesrechtlich)'],
  '125 EUR/Monat (nicht verbrauchte Betraege koennen bis Juni des Folgejahres angespart werden)',
  'Schriftlich bei der Pflegekasse; Nachweis durch Rechnungen anerkannter Anbieter',
  3, 4,
  ARRAY['Gilt auch fuer Pflegegrad 1!', 'Betraege kumulieren sich - bis zu 1.500 EUR koennen angespart werden', 'Kann fuer haushaltsnahe Dienstleister genutzt werden (mit Landesanerkennung)'],
  ARRAY['Anbieter nicht landesrechtlich anerkannt', 'Monatsgrenzen ueberschritten ohne Anspar-Nachweis'],
  'pflege', 5
),

-- 6. Pflegehilfsmittel
(
  'Pflegehilfsmittel', 'Hilfsmittel §40',
  '§40 SGB XI', 'Pflegekasse',
  'Erstattung von Pflegehilfsmitteln zum Verbrauch (Handschuhe, Mundschutz etc.) und technischen Hilfsmitteln (Pflegebett, Rollstuhl).',
  ARRAY['Pflegegrad 1-5', 'Haeusliche Pflege'],
  'Verbrauchshilfsmittel: bis 40 EUR/Monat | Technische Hilfsmittel: individuelle Kostenuebnahme nach Antrag',
  'Online oder schriftlich bei der Pflegekasse; technische Hilfsmittel mit Kostenvoranschlag',
  4, 4,
  ARRAY['Verbrauchsmittel koennen online ohne Vorantrag bestellt werden (viele Kassen)', 'Technische Hilfsmittel vor Kauf genehmigen lassen', 'Kombination mit Krankenversicherungs-Hilfsmitteln moeglich'],
  ARRAY['Technisches Hilfsmittel ohne Vorabgenehmigung gekauft', 'Falschen Anbieter ohne Kassenzulassung gewaehlt'],
  'pflege', 6
),

-- 7. Wohnumfeldverbesserung
(
  'Wohnumfeldverbesserung', 'Wohnumfeld §40 Abs. 4',
  '§40 Abs. 4 SGB XI', 'Pflegekasse',
  'Zuschuesse fuer Umbaumassnahmen zur Verbesserung des Wohnumfelds (barrierefreier Umbau, Badezimmer, Tuerverbreiterung, Treppenlifte etc.).',
  ARRAY['Pflegegrad 1-5', 'Haeusliche Pflege', 'Massnahme erleichtert Pflege oder ermoeglicht selbstaendigere Lebensfuehrung'],
  'Bis 4.000 EUR pro Massnahme, max. 16.000 EUR gesamt (bei Wohngemeinschaft bis zu 16.000 EUR je Person)',
  'Schriftlich bei der Pflegekasse VOR Beginn der Massnahme mit Kostenvoranschlag',
  6, 4,
  ARRAY['IMMER vor Beginn der Massnahme beantragen - sonst kein Anspruch!', 'Mehrere Massnahmen koennen gestaffelt beantragt werden', 'KfW-Foerderprogramm kann zusaetzlich genutzt werden (altersgerecht umbauen)'],
  ARRAY['Massnahme vor Antrag begonnen', 'Kein Kostenvoranschlag eingereicht', 'Pflegegrad noch nicht festgestellt'],
  'wohnen', 7
),

-- 8. Hilfe zur Pflege (Sozialhilfe)
(
  'Hilfe zur Pflege (Sozialhilfe)', 'Hilfe zur Pflege §65',
  '§65 SGB XII', 'Sozialamt',
  'Ergaenzungsleistung des Sozialamts, wenn der Eigenanteil fuer Pflege das eigene Einkommen/Vermoegen uebersteigt. Nachrangig zu SGB XI.',
  ARRAY['Einkommen und Vermoegen reichen nicht zur Deckung des Pflegeeigenanteils', 'Pflegebedarf anerkannt (Pflegegrad oder Hilfebedarf)', 'Kein vorrangiger Anspruch mehr moeglich (SGB XI ausgeschoepft)'],
  'Abhaengig von Einkommen/Vermoegen - Sozialamt uebernimmt verbleibenden Eigenanteil',
  'Persoenlich beim zustaendigen Sozialamt (Wohnortprinzip)',
  8, 4,
  ARRAY['Sofort beantragen - keine rueckwirkende Zahlung!', 'Vermoegensgrenze pruefen (2026: 10.000 EUR Schonvermoegen)', 'Unterhaltspflicht Angehoerige seit 2020 erst ab 100.000 EUR Jahreseinkommen'],
  ARRAY['Zu spaet beantragt', 'Vermoegen zu hoch eingeschaetzt - Schonvermoegen nicht beruecksichtigt', 'Angehoerigen-Unterhaltspflicht unterschaetzt'],
  'sozialhilfe', 8
),

-- 9. Betreuungsverfuegung & Vorsorgevollmacht
(
  'Betreuungsverfuegung & Vorsorgevollmacht', 'Vorsorgevollmacht',
  'BGB §§1814 ff.', 'Betreuungsgericht / Notar',
  'Vorsorgedokumente, die verhindern, dass das Betreuungsgericht einen fremden Betreuer bestellt. Umfassen Vorsorgevollmacht, Patientenverfuegung und Betreuungsverfuegung.',
  ARRAY['Volljaehrig und geschaeftsfaehig', 'Keine bestehende gerichtliche Betreuung'],
  'Privatschriftlich kostenlos oder Notarkosten ca. 70-150 EUR; Gerichtskosten bei gesetzlicher Betreuung ca. 200-500 EUR',
  'Vorsorgevollmacht: schriftlich selbst erstellen oder Notar; Betreuungsgericht: Antrag beim oertlichen Amtsgericht',
  NULL, NULL,
  ARRAY['Dokumente beim Zentralen Vorsorgeregister der Bundesnotarkammer registrieren lassen (bundesweit abrufbar)', 'Vertrauensperson muss Vollmacht akzeptieren und bereit sein', 'Kopien beim Hausarzt und bei Vertrauenspersonen hinterlegen'],
  ARRAY['Vollmacht ist nicht mehr gueltig wegen Formfehler', 'Keine Registrierung - im Notfall nicht auffindbar', 'Vollmacht umfasst keine Gesundheitsentscheidungen'],
  'sonstiges', 9
),

-- 10. Schwerbehindertenausweis
(
  'Schwerbehindertenausweis', 'SchwbA §152',
  '§152 SGB IX', 'Versorgungsamt',
  'Ausweis fuer anerkannte Schwerbehinderung (GdB ab 50) mit Nachteilsausgleichen: Steuerfreibetraege, Parkerleichterungen, Kuendigungsschutz, Fahrpreisermaessigungen.',
  ARRAY['Grad der Behinderung (GdB) von mindestens 50', 'Antrag beim Versorgungsamt am Wohnort', 'Aerztliche Nachweise ueber Behinderungen/Erkrankungen'],
  'Kostenlos; Nachteilsausgleiche je nach GdB und Merkzeichen (z.B. G, B, aG, H, RF)',
  'Schriftlich oder online beim Versorgungsamt des Wohnortes',
  12, 4,
  ARRAY['Alle aerztlichen Gutachten und Befundberichte einreichen', 'Bei Ablehnung immer Widerspruch einlegen - GdB wird oft zu niedrig angesetzt', 'Merkzeichen H (hilflos) ermoeglicht zusaetzliche Pflegeleistungen und Steuerfreibetraege'],
  ARRAY['Zu wenige aerztliche Nachweise eingereicht', 'Merkzeichen vergessen zu beantragen', 'Widerspruchsfrist bei Ablehnung versaeumt'],
  'behinderung', 10
),

-- 11. Grundsicherung im Alter
(
  'Grundsicherung im Alter', 'Grundsicherung §41',
  '§41 SGB XII', 'Sozialamt',
  'Leistung fuer Menschen ab Regelaltersgrenze oder dauerhaft Erwerbsgeminderte, deren Rente nicht zur Sicherung des Lebensunterhalts ausreicht.',
  ARRAY['Rentenbezieher oder dauerhaft voll erwerbsgemindert', 'Einkommen unter dem Grundsicherungsniveau', 'Wohnsitz in Deutschland'],
  'Differenzbetrag zwischen Rente/Einkommen und dem Grundsicherungsbedarf (Regelsatz 2026: ca. 563 EUR + Wohnkosten)',
  'Schriftlich beim Sozialamt am Wohnort',
  8, 4,
  ARRAY['Kinder muessen erst ab 100.000 EUR Jahreseinkommen zahlen (seit 2020)', 'Schonvermoegen beachten: 10.000 EUR', 'Antrag rueckwirkend nur fuer laufenden Monat moeglich - sofort stellen!'],
  ARRAY['Angehoerigen-Unterhalt ueberschaetzt - Antrag nicht gestellt', 'Zu spaet beantragt', 'Wohnkosten nicht vollstaendig angegeben'],
  'sozialhilfe', 11
),

-- 12. Haeusliche Krankenpflege
(
  'Haeusliche Krankenpflege', 'HKP §37 SGB V',
  '§37 SGB V', 'Krankenkasse',
  'Behandlungspflege durch qualifizierte Pflegefachkraft nach aerztlicher Verordnung (Wundversorgung, Medikamentengabe, Injektionen etc.) - zu Lasten der GKV.',
  ARRAY['GKV-Versichert', 'Aerztliche Verordnung der haeuslichen Krankenpflege', 'Krankenhaus-Vermeidung oder Sicherung des Behandlungserfolgs'],
  'Keine Kostengrenze bei Behandlungspflege; Zuzahlung: 10% der Kosten + 10 EUR/Verordnung (max. Belastungsgrenze)',
  'Aerztliche Verordnung beim Hausarzt; Einreichung bei Krankenkasse',
  2, 4,
  ARRAY['Verordnung muss VOR Beginn der Pflege ausgestellt werden', 'Verlaengerungen rechtzeitig beim Arzt beantragen', 'Kombinierbar mit Pflegeleistungen nach SGB XI'],
  ARRAY['Verordnung erst nach Pflegebeginn ausgestellt', 'Falsche Verordnungsart (Grundpflege statt Behandlungspflege)'],
  'gesundheit', 12
),

-- 13. Pflegekurs fuer Angehoerige
(
  'Pflegekurs fuer Angehoerige', 'Pflegekurs §45',
  '§45 SGB XI', 'Pflegekasse',
  'Kostenfreie Schulungen fuer pflegende Angehoerige zur praktischen Pflege, Erste Hilfe, Umgang mit Demenz u.a. - auch als Einzelschulung zu Hause moeglich.',
  ARRAY['Pflegebeduerftige Person mit Pflegegrad 1-5', 'Pflegende Angehoerige oder ehrenamtliche Pflegepersonen'],
  'Kostenlos (von der Pflegekasse finanziert)',
  'Anmeldung bei der Pflegekasse oder direkt bei anerkannten Schulungsanbietern',
  2, NULL,
  ARRAY['Auch als Einzelschulung zu Hause durch Pflegedienst moeglich', 'Demenzspezifische Kurse besonders empfohlen', 'VdK und Caritas bieten haeufig kostenlose Kurse an'],
  ARRAY['Kurs bei nicht anerkanntem Anbieter - nicht von Kasse uebernommen'],
  'pflege', 13
),

-- 14. Rentenbeitraege fuer Pflegepersonen
(
  'Rentenbeitraege fuer Pflegepersonen', 'Rentenbeitrag §44',
  '§44 SGB XI', 'Rentenversicherung (via Pflegekasse)',
  'Pflegende Angehoerige erhalten Rentenpunkte, wenn sie nicht erwerbsmaessig einen Pflegebeduerftigen pflegen - Beitraege zahlt die Pflegekasse an die Rentenversicherung.',
  ARRAY['Nicht erwerbsmaessige Pflegetaetigkeit', 'Mindestens 10 Stunden/Woche Pflege', 'Mindestens Pflegegrad 2', 'Weniger als 30 Std./Woche Erwerbstaetigkeit'],
  'Rentenrelevant: ca. 0,3-1,1 Rentenpunkte pro Jahr je nach Pflegegrad und Stundenumfang',
  'Automatisch ueber Pflegekasse an Rentenversicherung gemeldet beim Antrag auf Pflegegeld',
  NULL, NULL,
  ARRAY['Wird automatisch von der Pflegekasse gemeldet wenn Pflegegeld beantragt', 'Bei Pflegegrad 4+5 hoehere Rentenwertpunkte', 'Luecken in der Rente werden durch Pflegezeit-Beitraege geschlossen'],
  ARRAY['Nicht rechtzeitig Pflegegeld beantragt - keine automatische Meldung'],
  'rente', 14
),

-- 15. Pflegeunterstuetzungsgeld & Familienpflegezeit
(
  'Pflegeunterstuetzungsgeld & Familienpflegezeit', 'PflegeZG/FPfZG',
  'PflegeZG §2, FPfZG §2', 'Arbeitgeber + Bundesamt fuer Familie (BAFzA)',
  'Kurzfristige Arbeitsverhinderung (10 Tage) mit Pflegeunterstuetzungsgeld sowie Familienpflegezeit (bis 24 Monate Teilzeit) oder Pflegezeit (bis 6 Monate Freistellung) mit Kuendigungsschutz.',
  ARRAY['Sozialversicherungspflichtiges Beschaeftigungsverhaeltnis', 'Naher Angehoeriger mit akut gesteigertem Pflegebedarf', 'Betrieb mit mehr als 25 Beschaeftigten (Familienpflegezeit)'],
  'Pflegeunterstuetzungsgeld: ca. 90% des Nettoentgelts fuer max. 10 Tage | Familienpflegezeit: zinsloses Darlehen vom BAFzA moeglich',
  'Arbeitgeber informieren (Ankuendigungsfrist 10 Tage) + Pflegeunterstuetzungsgeld bei der Pflegekasse beantragen',
  2, NULL,
  ARRAY['Arbeitgeber sofort schriftlich informieren (auch bei kurzfristiger Verhinderung)', 'Zinsloses Darlehen beim BAFzA beantragen fuer Gehaltsausfall bei laengerer Pflegezeit', 'Kuendigungsschutz gilt ab Ankuendigung'],
  ARRAY['Arbeitgeber zu spaet oder nur muendlich informiert', 'Darlehen beim BAFzA nicht beantragt', 'Fristen bei der Rueckkehr nicht eingehalten'],
  'arbeit', 15
);

-- ─── Seed: Behoerden-Verzeichnis ─────────────────────────────────────────────

INSERT INTO behoerden_verzeichnis
  (name, typ, plz, ort, strasse, telefon, email, webseite, oeffnungszeiten, zustaendig_fuer)
VALUES

(
  'Pflegekasse der Techniker Krankenkasse (TK)',
  'Pflegekasse',
  '22047', 'Hamburg',
  'Bramfelder Str. 140',
  '040 460 60-0',
  'service@tk.de',
  'https://www.tk.de/pflege',
  'Mo-Fr 7-24 Uhr, Sa 8-24 Uhr (Telefon)',
  ARRAY['Pflegegeld §37', 'Pflegesachleistungen §36', 'Kurzzeitpflege §42', 'Verhinderungspflege §39', 'Entlastungsbetrag §45b', 'Pflegehilfsmittel §40', 'Wohnumfeldverbesserung §40', 'Pflegekurs §45', 'Rentenbeitraege §44']
),

(
  'Sozialamt Berlin Mitte',
  'Sozialamt',
  '10115', 'Berlin',
  'Mathilde-Jacob-Platz 1',
  '030 9018-45070',
  'sozialamt@ba-mitte.berlin.de',
  'https://www.berlin.de/ba-mitte/politik-und-verwaltung/aemter/sozialamt/',
  'Mo 08:00-15:00, Di 08:00-15:00, Mi geschlossen, Do 08:00-18:00, Fr 08:00-14:00',
  ARRAY['Hilfe zur Pflege §65 SGB XII', 'Grundsicherung im Alter §41 SGB XII', 'Sozialhilfe']
),

(
  'Versorgungsamt Muenchen',
  'Versorgungsamt',
  '80331', 'Muenchen',
  'Richelstr. 2',
  '089 2192-01',
  'versorgungsamt@reg-ob.bayern.de',
  'https://www.regierung.oberbayern.bayern.de/aufgaben/soziales/versorgungsamt/',
  'Mo-Fr 08:30-12:00 (Persoenlich), Termine nach Vereinbarung',
  ARRAY['Schwerbehindertenausweis §152 SGB IX', 'GdB-Feststellung', 'Merkzeichen', 'Kriegsopferversorgung']
),

(
  'VdK Beratungsstelle Koeln',
  'Beratungsstelle',
  '50667', 'Koeln',
  'Magnusstr. 18',
  '0221 2076-0',
  'beratung@vdk-koeln.de',
  'https://www.vdk.de/kv-koeln/',
  'Mo-Do 09:00-16:00, Fr 09:00-13:00',
  ARRAY['Sozialrechtsberatung', 'Widerspruchsbegleitung', 'Pflegegradberatung', 'Rentenberatung', 'Schwerbehindertenrecht']
),

(
  'Pflegestuetzpunkt Frankfurt am Main',
  'Pflegestuetzpunkt',
  '60313', 'Frankfurt am Main',
  'Zeil 5',
  '069 212-38981',
  'pflegestuetzpunkt@stadt-frankfurt.de',
  'https://www.frankfurt.de/pflegestuetzpunkt',
  'Mo, Mi, Fr 09:00-13:00 | Di, Do 13:00-17:00 (Termine empfohlen)',
  ARRAY['Kostenlose Pflegeberatung §7a SGB XI', 'Alle Pflegeleistungen SGB XI', 'Sozialhilfe SGB XII', 'Wohnberatung', 'Entlastungsangebote']
);

-- ============================================================
-- F35: Pflegeperson-Rechte-Checker
-- Tables: rechte_checks (user assessments) + pflegeperson_rechte (master data)
-- ============================================================

-- ── 1. rechte_checks — Gespeicherte Rechte-Prüfungen eines Nutzers ───────────

CREATE TABLE IF NOT EXISTS rechte_checks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  situation    JSONB       NOT NULL,
  ergebnis     JSONB       NOT NULL,
  erstellt_am  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rechte_checks_user_idx
  ON rechte_checks (user_id, erstellt_am DESC);

ALTER TABLE rechte_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rechte_checks_owner_select"
  ON rechte_checks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "rechte_checks_owner_insert"
  ON rechte_checks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "rechte_checks_owner_delete"
  ON rechte_checks FOR DELETE
  USING (user_id = auth.uid());

-- ── 2. pflegeperson_rechte — Stammdaten der Rechte / Gesetze ─────────────────

CREATE TABLE IF NOT EXISTS pflegeperson_rechte (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  gesetz          TEXT    NOT NULL,
  paragraph       TEXT,
  titel           TEXT    NOT NULL,
  beschreibung    TEXT    NOT NULL,
  voraussetzungen TEXT[],
  dauer           TEXT,
  leistung        TEXT,
  antrag_bei      TEXT,
  kategorie       TEXT    CHECK (kategorie IN ('freistellung','kuendigung','geld','gesundheit','sonstiges')),
  aktiv           BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS pflegeperson_rechte_aktiv_idx
  ON pflegeperson_rechte (aktiv, kategorie);

ALTER TABLE pflegeperson_rechte ENABLE ROW LEVEL SECURITY;

-- Öffentliches Lesen nur für aktive Einträge
CREATE POLICY "pflegeperson_rechte_public_read"
  ON pflegeperson_rechte FOR SELECT
  USING (aktiv = true);

-- ── 3. Seed — 12 Rechte für pflegende Angehörige ─────────────────────────────

INSERT INTO pflegeperson_rechte
  (gesetz, paragraph, titel, beschreibung, voraussetzungen, dauer, leistung, antrag_bei, kategorie, aktiv)
VALUES

-- 1. Kurzzeitige Arbeitsverhinderung
(
  'PflegeZG',
  '§ 3 PflegeZG',
  'Kurzzeitige Arbeitsverhinderung',
  'Bei einem akut aufgetretenen Pflegefall eines nahen Angehörigen haben Sie das Recht, der Arbeit kurzfristig fernzubleiben, um eine bedarfsgerechte Pflege zu organisieren oder eine notwendige Pflege sicherzustellen.',
  ARRAY[
    'Beschäftigung bei einem Arbeitgeber mit mindestens 15 Beschäftigten',
    'Naher Angehöriger ist pflegebedürftig',
    'Akuter Pflegefall – unvorhergesehenes Ereignis',
    'Häusliche Pflege muss notwendig sein'
  ],
  'Bis zu 10 Arbeitstage je Pflegefall',
  'Freistellung von der Arbeit; Anspruch auf Pflegeunterstützungsgeld als Lohnersatz (§ 44a SGB XI)',
  'Arbeitgeber (formlose Mitteilung); Pflegeunterstützungsgeld bei der Pflegekasse des Pflegebedürftigen',
  'freistellung',
  true
),

-- 2. Pflegezeit
(
  'PflegeZG',
  '§ 4 PflegeZG',
  'Pflegezeit (vollständige oder teilweise Freistellung)',
  'Beschäftigte können sich zur häuslichen Pflege eines nahen Angehörigen vollständig oder teilweise von der Arbeit freistellen lassen. Der Arbeitgeber ist zur Zustimmung verpflichtet, wenn er 15 oder mehr Beschäftigte hat.',
  ARRAY[
    'Beschäftigung bei einem Arbeitgeber mit mindestens 15 Beschäftigten',
    'Naher Angehöriger ist pflegebedürftig (Pflegegrad 1–5)',
    'Häusliche Pflege',
    'Schriftliche Ankündigung mindestens 10 Tage vor Beginn beim Arbeitgeber'
  ],
  'Bis zu 6 Monate (vollständige oder teilweise Freistellung)',
  'Freistellung (vollständig oder teilweise) ohne Entgeltzahlung; zinsloses Pflegezeitdarlehen beim Bundesamt für Familie und zivilgesellschaftliche Aufgaben (BAFzA) möglich',
  'Schriftliche Ankündigung beim Arbeitgeber; Darlehensantrag beim BAFzA',
  'freistellung',
  true
),

-- 3. Familienpflegezeit
(
  'FPfZG',
  '§ 2 FPfZG',
  'Familienpflegezeit',
  'Beschäftigte können ihre Arbeitszeit für die häusliche Pflege eines nahen Angehörigen auf mindestens 15 Stunden pro Woche reduzieren. Der Arbeitgeber muss zustimmen, wenn er 25 oder mehr Beschäftigte hat.',
  ARRAY[
    'Beschäftigung bei einem Arbeitgeber mit mindestens 25 Beschäftigten',
    'Naher Angehöriger ist pflegebedürftig (Pflegegrad 1–5)',
    'Häusliche Pflege',
    'Mindestarbeitszeit von 15 Stunden pro Woche muss verbleiben',
    'Schriftliche Ankündigung mindestens 8 Wochen vor Beginn'
  ],
  'Bis zu 24 Monate',
  'Teilfreistellung (mind. 15 h/Woche Restarbeitszeit); zinsloses Familienpflegezeitdarlehen beim BAFzA möglich',
  'Schriftliche Ankündigung beim Arbeitgeber; Darlehensantrag beim BAFzA',
  'freistellung',
  true
),

-- 4. Begleitung in der letzten Lebensphase
(
  'PflegeZG',
  '§ 5 PflegeZG',
  'Begleitung in der letzten Lebensphase',
  'Beschäftigte können sich zur Begleitung eines nahen Angehörigen in der letzten Lebensphase vollständig oder teilweise von der Arbeit freistellen lassen – auch wenn der Angehörige nicht zu Hause gepflegt wird.',
  ARRAY[
    'Beschäftigung bei einem Arbeitgeber mit mindestens 15 Beschäftigten',
    'Naher Angehöriger befindet sich in der letzten Lebensphase',
    'Schriftliche Ankündigung beim Arbeitgeber'
  ],
  'Bis zu 3 Monate',
  'Vollständige oder teilweise Freistellung; zinsloses Darlehen beim BAFzA möglich',
  'Schriftliche Ankündigung beim Arbeitgeber; Darlehensantrag beim BAFzA',
  'freistellung',
  true
),

-- 5. Kündigungsschutz während Pflegezeit
(
  'PflegeZG',
  '§ 5 Abs. 1 PflegeZG',
  'Kündigungsschutz während der Pflegezeit',
  'Von der Ankündigung der Pflegezeit, Familienpflegezeit oder der kurzzeitigen Arbeitsverhinderung bis zur Beendigung dieser Freistellung besteht ein besonderer Kündigungsschutz. Eine Kündigung durch den Arbeitgeber ist in dieser Zeit grundsätzlich unzulässig.',
  ARRAY[
    'Ankündigung oder Inanspruchnahme von Pflegezeit, Familienpflegezeit oder kurzzeitiger Arbeitsverhinderung',
    'Gilt ab dem Zeitpunkt der Ankündigung'
  ],
  'Gesamte Dauer der Freistellung (inkl. Ankündigungsphase)',
  'Schutz vor Kündigung durch den Arbeitgeber; in Ausnahmefällen nur mit Zustimmung der Arbeitsschutzbehörde',
  'Keine Antragstellung nötig (entsteht automatisch); bei Kündigung: Arbeitsgericht',
  'kuendigung',
  true
),

-- 6. Soziale Sicherung der Pflegeperson (Rente + Unfallversicherung)
(
  'SGB XI',
  '§ 44a SGB XI',
  'Soziale Sicherung der Pflegeperson (Rente und Unfallversicherung)',
  'Pflegepersonen, die einen Angehörigen mit Pflegegrad 2–5 mindestens 10 Stunden wöchentlich (verteilt auf mindestens 2 Tage) häuslich pflegen und nicht mehr als 30 Stunden erwerbstätig sind, erhalten Beiträge zur Rentenversicherung und sind gesetzlich unfallversichert.',
  ARRAY[
    'Pflegebedürftiger hat Pflegegrad 2, 3, 4 oder 5',
    'Häusliche Pflege',
    'Pflegeumfang mindestens 10 Stunden pro Woche, verteilt auf mindestens 2 Tage',
    'Pflegeperson ist nicht mehr als 30 Stunden pro Woche erwerbstätig'
  ],
  'Solange die Pflegetätigkeit besteht',
  'Beitragszahlung zur gesetzlichen Rentenversicherung (Höhe richtet sich nach Pflegegrad); gesetzlicher Unfallversicherungsschutz während der Pflegearbeit',
  'Pflegekasse des Pflegebedürftigen (automatisch nach Feststellung des Pflegegrades)',
  'gesundheit',
  true
),

-- 7. Pflegegeld als Anerkennung
(
  'SGB XI',
  '§ 37 SGB XI',
  'Pflegegeld für selbst beschaffte Pflegehilfen',
  'Pflegebedürftige mit Pflegegrad 2–5 erhalten Pflegegeld, wenn sie die Pflege selbst sicherstellen (z. B. durch Angehörige). Das Pflegegeld kann als finanzielle Anerkennung an die pflegende Person weitergegeben werden.',
  ARRAY[
    'Pflegebedürftiger hat Pflegegrad 2, 3, 4 oder 5',
    'Häusliche Pflege, selbst sichergestellt',
    'Kein oder nur anteiliger Bezug von Sachleistungen'
  ],
  'Monatlich, solange die Pflegebedürftigkeit besteht',
  'Pflegegrad 2: 332 €/Monat; Pflegegrad 3: 573 €/Monat; Pflegegrad 4: 765 €/Monat; Pflegegrad 5: 947 €/Monat',
  'Pflegekasse des Pflegebedürftigen',
  'geld',
  true
),

-- 8. Entlastungsbetrag
(
  'SGB XI',
  '§ 45b SGB XI',
  'Entlastungsbetrag (125 €/Monat)',
  'Pflegebedürftige mit anerkanntem Pflegegrad 1–5 haben Anspruch auf einen monatlichen Entlastungsbetrag von 125 €. Der Betrag ist zweckgebunden für anerkannte Entlastungsleistungen, zum Beispiel Tagesbetreuung, hauswirtschaftliche Hilfe oder niedrigschwellige Betreuungsangebote.',
  ARRAY[
    'Pflegebedürftiger hat Pflegegrad 1, 2, 3, 4 oder 5',
    'Ambulante Pflegesituation (zu Hause oder betreutes Wohnen)',
    'Inanspruchnahme anerkannter Entlastungsleistungen'
  ],
  '125 €/Monat (nicht verbrauchte Beträge können bis zu 12 Monate übertragen werden)',
  '125 € pro Monat für anerkannte Entlastungsleistungen (Erstattungsprinzip)',
  'Pflegekasse des Pflegebedürftigen; Abrechnung über zugelassene Anbieter',
  'geld',
  true
),

-- 9. Arbeitgeberpflichten – Gefährdungsbeurteilung
(
  'ArbSchG',
  '§ 3 ArbSchG',
  'Arbeitgeberpflichten zum Gesundheitsschutz',
  'Arbeitgeber sind verpflichtet, Maßnahmen des Arbeitsschutzes zu treffen. Pflegende Angehörige können ihren Arbeitgeber auf besondere Belastungen hinweisen und Anpassungen verlangen, z. B. flexible Arbeitszeiten oder Homeoffice, um körperliche und psychische Überlastung zu vermeiden.',
  ARRAY[
    'Bestehendes Arbeitsverhältnis',
    'Nachgewiesene besondere Belastung durch Pflegetätigkeit'
  ],
  'Dauerhaft während des Arbeitsverhältnisses',
  'Anspruch auf Gefährdungsbeurteilung und angemessene Schutzmaßnahmen; ggf. Anpassung der Arbeitsbedingungen',
  'Arbeitgeber; Betriebsrat (falls vorhanden); Arbeitsschutzbehörde des Bundeslandes',
  'gesundheit',
  true
),

-- 10. Kranken- und Pflegeversicherung für Pflegepersonen
(
  'SGB XI',
  '§ 44a SGB XI',
  'Kranken- und Pflegeversicherungsschutz für Pflegepersonen',
  'Pflegepersonen, die aufgrund ihrer Pflegetätigkeit nicht oder nur geringfügig erwerbstätig sind, können unter bestimmten Voraussetzungen beitragsfrei in der gesetzlichen Kranken- und Pflegeversicherung mitversichert werden oder erhalten Zuschüsse zu ihren Beiträgen.',
  ARRAY[
    'Pflegebedürftiger hat Pflegegrad 2–5',
    'Häusliche Pflege mindestens 10 Stunden pro Woche',
    'Pflegeperson nicht mehr als 30 Stunden pro Woche erwerbstätig',
    'Pflegeperson war vor Pflegebeginn gesetzlich versichert'
  ],
  'Solange die Pflegetätigkeit besteht',
  'Übernahme oder Zuschuss zu Kranken- und Pflegeversicherungsbeiträgen durch die Pflegekasse',
  'Pflegekasse des Pflegebedürftigen',
  'gesundheit',
  true
),

-- 11. Schulungsanspruch für Pflegepersonen
(
  'SGB XI',
  '§ 45 SGB XI',
  'Schulungsanspruch für pflegende Angehörige',
  'Pflegepersonen haben Anspruch auf kostenlose Schulungskurse, die von der Pflegekasse angeboten oder finanziert werden. Die Kurse vermitteln praktische Pflegekenntnisse, Umgang mit demenziellen Erkrankungen und Entlastungsstrategien.',
  ARRAY[
    'Pflegeperson pflegt einen nahen Angehörigen häuslich',
    'Pflegebedürftiger ist Versicherter der Pflegekasse'
  ],
  'Bedarfsorientiert; Kurse finden regelmäßig statt',
  'Kostenlose Teilnahme an Pflegekursen (auch Hausbesuche möglich); Schulung für die gesamte Pflegefamilie',
  'Pflegekasse des Pflegebedürftigen',
  'sonstiges',
  true
),

-- 12. Pflegeunterstützungsgeld (Lohnersatz)
(
  'SGB XI',
  '§ 44a SGB XI',
  'Pflegeunterstützungsgeld (Lohnersatz bei kurzzeitiger Arbeitsverhinderung)',
  'Wer wegen eines akuten Pflegefalls kurzfristig der Arbeit fernbleiben muss (§ 3 PflegeZG), erhält Pflegeunterstützungsgeld als Lohnersatz von der Pflegekasse. Es ersetzt das wegfallende Nettoentgelt für maximal 10 Arbeitstage.',
  ARRAY[
    'Inanspruchnahme der kurzzeitigen Arbeitsverhinderung nach § 3 PflegeZG',
    'Naher Angehöriger hat Pflegegrad 1–5 oder Pflegebedürftigkeit ist ärztlich bescheinigt',
    'Beschäftigung bei einem Arbeitgeber mit mindestens 15 Beschäftigten',
    'Kein Anspruch auf Entgeltfortzahlung durch den Arbeitgeber'
  ],
  'Bis zu 10 Arbeitstage je Pflegefall',
  'Ca. 90 % des ausgefallenen Nettoentgelts (analog Kinderkrankengeld), maximal nach Beitragsbemessungsgrenze',
  'Pflegekasse des Pflegebedürftigen (Antrag innerhalb von 2 Wochen nach Arbeitsverhinderung)',
  'geld',
  true
);

// ============================================================
// Zarit Burden Interview — 22-item validated screening tool
// Each item scored 0–4: 0=Nie, 1=Selten, 2=Manchmal, 3=Häufig, 4=Fast immer
// Total score range: 0–88
// ============================================================

export interface ZaritFrage {
  id: number
  text: string
  kategorie: 'belastung' | 'scham' | 'kontrolle' | 'sozial' | 'gesundheit'
}

export const ZARIT_ANTWORTEN = [
  { wert: 0, label: 'Nie' },
  { wert: 1, label: 'Selten' },
  { wert: 2, label: 'Manchmal' },
  { wert: 3, label: 'Häufig' },
  { wert: 4, label: 'Fast immer' },
] as const

export const ZARIT_FRAGEN: ZaritFrage[] = [
  {
    id: 1,
    text: 'Fühlen Sie sich aufgrund Ihrer Pflegeaufgaben nicht genug Zeit für sich selbst zu haben?',
    kategorie: 'belastung',
  },
  {
    id: 2,
    text: 'Fühlen Sie sich gestresst, wenn Sie die Pflege mit anderen Verpflichtungen (Beruf, Familie) vereinbaren müssen?',
    kategorie: 'sozial',
  },
  {
    id: 3,
    text: 'Sind Sie wütend auf die Person, die Sie pflegen?',
    kategorie: 'belastung',
  },
  {
    id: 4,
    text: 'Wünschen Sie sich, Sie könnten jemand anderem die Pflege überlassen?',
    kategorie: 'belastung',
  },
  {
    id: 5,
    text: 'Fühlen Sie sich unsicher darüber, was Sie für die pflegebedürftige Person tun sollen?',
    kategorie: 'kontrolle',
  },
  {
    id: 6,
    text: 'Fühlen Sie sich aufgrund der Pflege belastet?',
    kategorie: 'belastung',
  },
  {
    id: 7,
    text: 'Haben Sie Angst, was in Zukunft mit der pflegebedürftigen Person geschieht?',
    kategorie: 'belastung',
  },
  {
    id: 8,
    text: 'Glauben Sie, dass die pflegebedürftige Person von Ihnen abhängig ist?',
    kategorie: 'kontrolle',
  },
  {
    id: 9,
    text: 'Fühlen Sie sich angespannt, wenn Sie in der Nähe der pflegebedürftigen Person sind?',
    kategorie: 'gesundheit',
  },
  {
    id: 10,
    text: 'Glauben Sie, dass Ihre Gesundheit durch die Pflege gelitten hat?',
    kategorie: 'gesundheit',
  },
  {
    id: 11,
    text: 'Haben Sie das Gefühl, weniger Privatsphäre zu haben als früher?',
    kategorie: 'sozial',
  },
  {
    id: 12,
    text: 'Hat Ihr soziales Leben durch die Pflege gelitten?',
    kategorie: 'sozial',
  },
  {
    id: 13,
    text: 'Haben Sie sich aufgrund der Pflege von Freunden und Bekannten zurückgezogen?',
    kategorie: 'sozial',
  },
  {
    id: 14,
    text: 'Erwartet die pflegebedürftige Person mehr Pflege, als Sie leisten können?',
    kategorie: 'kontrolle',
  },
  {
    id: 15,
    text: 'Glauben Sie, nicht genug Geld für die Pflege aufbringen zu können?',
    kategorie: 'belastung',
  },
  {
    id: 16,
    text: 'Haben Sie das Gefühl, Ihren eigenen Wünschen nicht mehr nachgehen zu können?',
    kategorie: 'belastung',
  },
  {
    id: 17,
    text: 'Haben Sie das Gefühl, nicht mehr in der Lage zu sein, die Pflege noch lange fortzusetzen?',
    kategorie: 'kontrolle',
  },
  {
    id: 18,
    text: 'Wünschen Sie sich manchmal, Sie könnten die pflegebedürftige Person einfach zurücklassen?',
    kategorie: 'belastung',
  },
  {
    id: 19,
    text: 'Fühlen Sie sich unsicher, was Sie für die pflegebedürftige Person tun sollen?',
    kategorie: 'kontrolle',
  },
  {
    id: 20,
    text: 'Glauben Sie, Sie sollten mehr für die pflegebedürftige Person tun, als Sie es tun?',
    kategorie: 'scham',
  },
  {
    id: 21,
    text: 'Glauben Sie, Sie könnten die pflegebedürftige Person besser versorgen?',
    kategorie: 'scham',
  },
  {
    id: 22,
    text: 'Insgesamt, wie stark fühlen Sie sich durch die Pflege belastet?',
    kategorie: 'belastung',
  },
]

// ============================================================
// Score interpretation
// ============================================================

export type Belastungsstufe = 'niedrig' | 'moderat' | 'hoch' | 'sehr_hoch'

export interface ZaritInterpretation {
  stufe: Belastungsstufe
  bezeichnung: string
  beschreibung: string
  farbe: 'green' | 'yellow' | 'orange' | 'red'
  empfehlungen: string[]
}

export function interpretiereZaritScore(score: number): ZaritInterpretation {
  if (score <= 20) {
    return {
      stufe: 'niedrig',
      bezeichnung: 'Niedrige Belastung',
      beschreibung: 'Sie kommen derzeit gut mit Ihrer Pflegesituation zurecht. Achten Sie auch weiterhin auf regelmäßige Auszeiten und Selbstfürsorge.',
      farbe: 'green',
      empfehlungen: [
        'Regelmäßige kurze Auszeiten einplanen – auch kleine Pausen helfen.',
        'Den Austausch mit anderen pflegenden Angehörigen suchen, um Erfahrungen zu teilen.',
        'Informieren Sie sich über die Leistungen der Pflegeversicherung (§39, §45b SGB XI).',
        'Vorsorge treffen: Notfallkontakte und Vertretungsplan für Krankheitsfälle anlegen.',
      ],
    }
  }
  if (score <= 40) {
    return {
      stufe: 'moderat',
      bezeichnung: 'Moderate Belastung',
      beschreibung: 'Sie erleben spürbare Belastungen durch die Pflege. Das ist normal und nachvollziehbar. Erste Unterstützungsangebote können Ihnen Entlastung bringen.',
      farbe: 'yellow',
      empfehlungen: [
        'Nutzen Sie das Entlastungsbetrag-Budget (125 €/Monat nach §45b SGB XI) für Alltagshilfen.',
        'Planen Sie eine Auszeit: Verhinderungspflege (bis 1.612 €/Jahr, §39 SGB XI) ermöglicht Urlaub.',
        'Sprechen Sie mit Ihrem Pflegestützpunkt über kostenlose Beratung und Unterstützung.',
        'Nehmen Sie Kontakt zu einer Selbsthilfegruppe für pflegende Angehörige auf.',
        'Achten Sie auf Ihre eigene Gesundheit: Schlaf, Bewegung, gesunde Ernährung.',
      ],
    }
  }
  if (score <= 60) {
    return {
      stufe: 'hoch',
      bezeichnung: 'Hohe Belastung',
      beschreibung: 'Ihre Belastung ist hoch. Es ist wichtig, jetzt Unterstützung zu holen – für sich selbst und für die Person, die Sie pflegen. Sie müssen das nicht alleine tragen.',
      farbe: 'orange',
      empfehlungen: [
        'Wenden Sie sich zeitnah an Ihren Pflegestützpunkt oder die Pflegeberatung Ihrer Pflegekasse.',
        'Sprechen Sie mit Ihrer Hausärztin oder Ihrem Hausarzt über Ihre eigene Gesundheitssituation.',
        'Beantragen Sie Verhinderungspflege (§39 SGB XI) für eine längere Auszeit.',
        'Erkunden Sie ambulante Pflegedienste, die Sie bei der täglichen Pflege entlasten.',
        'Treten Sie einer Selbsthilfegruppe bei – der Austausch mit Gleichgesinnten hilft nachweislich.',
        'Klären Sie, ob eine Kurzzeitpflege (§42 SGB XI) für Ihre Angehörige möglich wäre.',
      ],
    }
  }
  return {
    stufe: 'sehr_hoch',
    bezeichnung: 'Sehr hohe Belastung',
    beschreibung: 'Ihr Belastungsniveau ist sehr hoch. Bitte suchen Sie sich jetzt professionelle Unterstützung. Das ist keine Schwäche – es ist der wichtigste Schritt, den Sie für sich und Ihre Angehörige tun können.',
    farbe: 'red',
    empfehlungen: [
      'Sprechen Sie sofort mit Ihrer Ärztin oder Ihrem Arzt – sowohl für sich selbst als auch für Ihre Angehörige.',
      'Rufen Sie die kostenlose Pflegehotline an: 030 206 459 0 (Mo–Fr).',
      'Beantragen Sie umgehend professionelle Pflegeunterstützung durch einen ambulanten Dienst.',
      'Erwägen Sie eine vorübergehende stationäre Kurzzeitpflege (§42 SGB XI) für Ihre Angehörige.',
      'Nehmen Sie Kontakt zu einem psychosozialen Beratungsangebot auf – Ihre Gesundheit zählt.',
      'Informieren Sie Ihr soziales Umfeld: Familie, Freunde, Nachbarn können entlasten.',
    ],
  }
}

export function berechneZaritScore(antworten: Record<string, number>): number {
  return Object.values(antworten).reduce((sum, val) => sum + (val ?? 0), 0)
}

// ============================================================
// §39 SGB XI — Verhinderungspflege
// ============================================================

export const VERHINDERUNGSPFLEGE_JAHRESBUDGET_CENT = 161200  // 1.612 EUR
export const VERHINDERUNGSPFLEGE_MAX_TAGE = 42
export const KURZZEITPFLEGE_AUFSTOCKUNG_CENT = 161200  // up to additional 1.612 EUR from §42

export interface VerhinderungspflegeBerechnung {
  jahresbudget_cent: number
  eingesetzt_cent: number
  verbleibend_cent: number
  aufstockung_moeglich_cent: number
  gesamtbudget_mit_aufstockung_cent: number
  tage_verbleibend: number
  anteil_eingesetzt_prozent: number
}

export function berechneVerhinderungspflege(params: {
  eingesetzt_cent: number
  pflegegrad: number
}): VerhinderungspflegeBerechnung {
  const { eingesetzt_cent } = params
  const verbleibend_cent = Math.max(0, VERHINDERUNGSPFLEGE_JAHRESBUDGET_CENT - eingesetzt_cent)
  // Approximate days remaining based on proportional usage
  const tage_eingesetzt = Math.round((eingesetzt_cent / VERHINDERUNGSPFLEGE_JAHRESBUDGET_CENT) * VERHINDERUNGSPFLEGE_MAX_TAGE)
  const tage_verbleibend = Math.max(0, VERHINDERUNGSPFLEGE_MAX_TAGE - tage_eingesetzt)
  const anteil_eingesetzt_prozent = Math.min(100, Math.round((eingesetzt_cent / VERHINDERUNGSPFLEGE_JAHRESBUDGET_CENT) * 100))

  return {
    jahresbudget_cent: VERHINDERUNGSPFLEGE_JAHRESBUDGET_CENT,
    eingesetzt_cent,
    verbleibend_cent,
    aufstockung_moeglich_cent: KURZZEITPFLEGE_AUFSTOCKUNG_CENT,
    gesamtbudget_mit_aufstockung_cent: VERHINDERUNGSPFLEGE_JAHRESBUDGET_CENT + KURZZEITPFLEGE_AUFSTOCKUNG_CENT,
    tage_verbleibend,
    anteil_eingesetzt_prozent,
  }
}

// ============================================================
// §45b SGB XI — Entlastungsbetrag
// ============================================================

export const ENTLASTUNGSBETRAG_MONAT_CENT = 12500  // 125 EUR per month
export const ENTLASTUNGSBETRAG_JAHR_CENT = ENTLASTUNGSBETRAG_MONAT_CENT * 12  // 1.500 EUR

export interface EntlastungsbetragBerechnung {
  budget_cent: number
  verwendet_cent: number
  verbleibend_cent: number
  anteil_eingesetzt_prozent: number
  uebertrag_moeglich: boolean
}

export function berechneEntlastungsbetrag(ausgaben_monat_cent: number): EntlastungsbetragBerechnung {
  const verwendet_cent = Math.min(ausgaben_monat_cent, ENTLASTUNGSBETRAG_MONAT_CENT)
  const verbleibend_cent = Math.max(0, ENTLASTUNGSBETRAG_MONAT_CENT - verwendet_cent)
  const anteil_eingesetzt_prozent = Math.min(100, Math.round((verwendet_cent / ENTLASTUNGSBETRAG_MONAT_CENT) * 100))

  return {
    budget_cent: ENTLASTUNGSBETRAG_MONAT_CENT,
    verwendet_cent,
    verbleibend_cent,
    anteil_eingesetzt_prozent,
    uebertrag_moeglich: true, // unused amounts carry forward within the same calendar year
  }
}

// Anerkannte Leistungen nach §45b SGB XI
export const ANERKANNTE_LEISTUNGEN_45B = [
  'Tagespflege (ambulante)',
  'Alltagsbegleitung / Betreuungsdienste',
  'Haushaltshilfe (anerkannter Dienst)',
  'Betreuungsgruppen / Gruppenangebote',
  'Verleih von Pflegehilfsmitteln',
  'Familienpflege und Nachbarschaftshilfe (anerkannt)',
  'Tagesbetreuung in einer Pflegeeinrichtung',
  'Entlastungsangebote anerkannter Dienste',
  'Qualifizierte Betreuungspersonen (§45a SGB XI)',
  'Digitale Pflegeanwendungen (DiPA, soweit anerkannt)',
] as const

export type AnerkannteLeistung45b = typeof ANERKANNTE_LEISTUNGEN_45B[number]

// ============================================================
// Formatting helpers
// ============================================================

export function centToEuro(cent: number): string {
  return (cent / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

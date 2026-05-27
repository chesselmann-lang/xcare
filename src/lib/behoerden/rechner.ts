// F30: Behörden-Navigator — Rechenlogik & Planungshilfen

// ─── Wohnumfeldverbesserung §40 SGB XI ───────────────────────────────────────

export const WOHNUMFELD_MAX_PRO_MASSNAHME_CENT = 400_000 // 4.000 EUR
export const WOHNUMFELD_MAX_GESAMT_CENT = 1_600_000 // 16.000 EUR (4 Personen)

// ─── Rentenfreistellung §44 SGB XI ───────────────────────────────────────────

/**
 * 2026: Beitragsbemessungsgrundlage fuer Pflegepersonen nach §44 SGB XI.
 * Die Pflegekasse zahlt Beitraege an die Rentenversicherung.
 * Basis: % des jaehrlichen Durchschnittsentgelts je nach Pflegegrad.
 */
const RENTENBEITRAGSSATZ_2026 = 0.186 // 18,6% (allgemeiner Beitragssatz RV)
const DURCHSCHNITTSENTGELT_2026 = 4_535_800 // 45.358 EUR in Cent

/** Prozent des Durchschnittsentgelts je Pflegegrad (§44 Abs. 1 SGB XI) */
const PFLEGEGRAD_ENTGELT_PROZENT: Record<number, number> = {
  2: 0.266,
  3: 0.420,
  4: 0.700,
  5: 0.700,
}

export interface RentenbeitragsBerechnung {
  pflegegrad: number
  pflegestunden_woche: number
  jaehrlicher_rentenbeitrag_cent: number
  rentenpunkte_pro_jahr: number
  hinweis: string
}

/**
 * Berechnet den jaehrlichen Rentenbeitrag und die Rentenpunkte,
 * die die Pflegekasse fuer eine nicht erwerbsmaessige Pflegeperson entrichtet.
 *
 * Voraussetzung: mind. 10h/Woche Pflege, max. 30h/Woche Erwerbstaetigkeit.
 */
export function berechneRentenbeitrag(
  pflegegrad: number,
  stunden_woche: number
): RentenbeitragsBerechnung {
  if (pflegegrad < 2 || pflegegrad > 5) {
    return {
      pflegegrad,
      pflegestunden_woche: stunden_woche,
      jaehrlicher_rentenbeitrag_cent: 0,
      rentenpunkte_pro_jahr: 0,
      hinweis:
        'Kein Rentenanspruch: §44 SGB XI gilt erst ab Pflegegrad 2.',
    }
  }

  if (stunden_woche < 10) {
    return {
      pflegegrad,
      pflegestunden_woche: stunden_woche,
      jaehrlicher_rentenbeitrag_cent: 0,
      rentenpunkte_pro_jahr: 0,
      hinweis:
        'Kein Rentenanspruch: Mindestens 10 Stunden pro Woche Pflege erforderlich.',
    }
  }

  const entgeltProzent = PFLEGEGRAD_ENTGELT_PROZENT[pflegegrad] ?? 0.266
  const beitragsbemessungsgrundlage_cent =
    Math.round(DURCHSCHNITTSENTGELT_2026 * entgeltProzent)
  const jaehrlicher_rentenbeitrag_cent = Math.round(
    beitragsbemessungsgrundlage_cent * RENTENBEITRAGSSATZ_2026
  )

  // Rentenpunkte = Beitragsgrundlage / Durchschnittsentgelt
  const rentenpunkte_pro_jahr =
    Math.round((beitragsbemessungsgrundlage_cent / DURCHSCHNITTSENTGELT_2026) * 100) / 100

  return {
    pflegegrad,
    pflegestunden_woche: stunden_woche,
    jaehrlicher_rentenbeitrag_cent,
    rentenpunkte_pro_jahr,
    hinweis:
      `Die Pflegekasse zahlt ${(jaehrlicher_rentenbeitrag_cent / 100).toFixed(2)} EUR/Jahr an die Rentenversicherung. ` +
      `Das entspricht ca. ${rentenpunkte_pro_jahr.toFixed(2)} Rentenpunkten pro Jahr. ` +
      `Wird automatisch gemeldet, sobald Pflegegeld beantragt ist.`,
  }
}

// ─── Antragsplan-Generator ────────────────────────────────────────────────────

export interface AntragsSchritt {
  reihenfolge: number
  leistung_name: string
  behoerde: string
  warum_jetzt: string
  voraussetzung_fuer?: string[]
  zeitaufwand_std: number
}

/**
 * Erstellt einen priorisierten Antragsplan aus einer Liste benoetigter Leistungen.
 * Sortiert nach sinnvoller Reihenfolge: zuerst Pflegegrad, dann Pflegekassen-
 * Leistungen, dann nachgelagerte Leistungen (Sozialamt, Versorgungsamt etc.).
 */
export function erstelleAntragsplan(
  leistungen: Array<{
    name: string
    behoerde: string
    rechtsgrundlage: string
  }>
): AntragsSchritt[] {
  // Prioritaetsmatrix: niedrigere Zahl = frueher beantragen
  function getPrioritaet(leistung: { name: string; behoerde: string }): number {
    const name = leistung.name.toLowerCase()
    const behoerde = leistung.behoerde.toLowerCase()

    // Pflegegrad zuerst - alles haengt davon ab
    if (name.includes('pflegegrad') || name.includes('md')) return 0

    // Vorsorgedokumente fruehzeitig
    if (name.includes('vollmacht') || name.includes('verfuegung') || name.includes('betreuung')) return 1

    // Pflegekassen-Kernleistungen
    if (behoerde.includes('pflegekasse')) {
      if (name.includes('pflegegeld') || name.includes('sachleistung')) return 2
      if (name.includes('hilfsmittel') || name.includes('entlastung')) return 3
      if (name.includes('kurs') || name.includes('schulung')) return 4
      if (name.includes('rente') || name.includes('rentenbeit')) return 4
      if (name.includes('verhinderung') || name.includes('kurzzeit')) return 3
      if (name.includes('wohnumfeld') || name.includes('umbau')) return 5
      return 3
    }

    // Krankenkasse
    if (behoerde.includes('krankenkasse') || behoerde.includes('gkv')) return 3

    // Versorgungsamt (kann lange dauern)
    if (behoerde.includes('versorgungsamt')) return 4

    // Sozialamt (nachrangig zu SGB XI)
    if (behoerde.includes('sozialamt')) return 6

    // Rentenversicherung
    if (behoerde.includes('rentenversicherung') || behoerde.includes('drv')) return 5

    // Arbeitgeber / Jobcenter
    if (behoerde.includes('arbeitgeber') || behoerde.includes('jobcenter')) return 2

    return 7
  }

  const ERKLAERUNGEN: Record<string, string> = {
    pflegegeld:
      'Ohne Pflegegrad kein Anspruch auf Pflegeleistungen - zuerst MDK-Begutachtung beantragen.',
    pflegesachleistung:
      'Direkt nach Pflegegraderhalt beantragen - gilt ab Antragsdatum.',
    verhinderungspflege:
      'Vor der ersten Verhinderung beantragen, nicht erst wenn der Notfall eintritt.',
    kurzzeitpflege:
      'Vor Krankenhausentlassung oder Pflegeengpass beantragen.',
    entlastungsbetrag:
      'Gilt ab Pflegegrad 1 und kumuliert monatlich - fruehzeitig nutzen.',
    hilfsmittel:
      'Technische Hilfsmittel immer vorab genehmigen lassen.',
    wohnumfeld:
      'Unbedingt VOR Beginn der Umbaumassnahme beantragen - kein rueckwirkender Anspruch.',
    sozialhilfe:
      'Nachrangig zu SGB XI - erst beantragen wenn Pflegekassen-Leistungen ausgeschoepft.',
    grundsicherung:
      'Sofort beantragen - keine rueckwirkende Zahlung fuer vergangene Monate.',
    schwerbehinderung:
      'Fruehzeitig stellen - Bearbeitung dauert 3-6 Monate.',
    vollmacht:
      'Sollte geregelt sein bevor Entscheidungsunfaehigkeit eintritt.',
    rentenversicherung:
      'Wird automatisch gemeldet sobald Pflegegeld genehmigt ist.',
    familienpflegezeit:
      'Arbeitgeber sofort schriftlich informieren - Kuendigungsschutz gilt ab Ankuendigung.',
    pflegekurs:
      'Pruefe bei deiner Pflegekasse welche Kurse angeboten werden.',
    krankenpflege:
      'Verordnung vor Pflegebeginn vom Arzt ausstellen lassen.',
  }

  function getErklaerung(name: string, behoerde: string): string {
    const n = name.toLowerCase()
    for (const [key, text] of Object.entries(ERKLAERUNGEN)) {
      if (n.includes(key)) return text
    }
    if (behoerde.toLowerCase().includes('sozialamt')) {
      return 'Nachrangige Leistung - erst beantragen wenn andere Quellen ausgeschoepft.'
    }
    return 'Zeitnah beantragen - Leistungen gelten ab Antragsdatum.'
  }

  function getZeitaufwand(name: string, behoerde: string): number {
    const n = name.toLowerCase()
    if (n.includes('wohnumfeld') || n.includes('umbau')) return 3
    if (n.includes('schwerbehinderung') || n.includes('versorgungsamt')) return 3
    if (n.includes('sozialhilfe') || n.includes('grundsicherung')) return 2
    if (n.includes('vollmacht') || n.includes('verfuegung')) return 2
    if (n.includes('familienpflegezeit') || n.includes('pflegezeit')) return 1
    if (behoerde.toLowerCase().includes('pflegekasse')) return 1
    return 1
  }

  function getVoraussetzungFuer(
    name: string,
    allLeistungen: typeof leistungen
  ): string[] | undefined {
    const n = name.toLowerCase()
    if (n.includes('pflegegrad') || n.includes('md')) {
      // Pflegegrad ist Voraussetzung fuer fast alle anderen
      return allLeistungen
        .filter(
          (l) =>
            !l.name.toLowerCase().includes('pflegegrad') &&
            !l.name.toLowerCase().includes('vollmacht') &&
            !l.name.toLowerCase().includes('familienpflege')
        )
        .map((l) => l.name)
        .slice(0, 5) // Maximal 5 anzeigen
    }
    if (n.includes('pflegegeld') || n.includes('sachleistung')) {
      return allLeistungen
        .filter(
          (l) =>
            l.name.toLowerCase().includes('rente') ||
            l.name.toLowerCase().includes('verhinderung')
        )
        .map((l) => l.name)
    }
    return undefined
  }

  const sortiert = [...leistungen].sort(
    (a, b) => getPrioritaet(a) - getPrioritaet(b)
  )

  return sortiert.map((leistung, index) => ({
    reihenfolge: index + 1,
    leistung_name: leistung.name,
    behoerde: leistung.behoerde,
    warum_jetzt: getErklaerung(leistung.name, leistung.behoerde),
    voraussetzung_fuer: getVoraussetzungFuer(leistung.name, leistungen),
    zeitaufwand_std: getZeitaufwand(leistung.name, leistung.behoerde),
  }))
}

// ─── Widerspruch-Briefgenerator ───────────────────────────────────────────────

export interface WiderspruchParams {
  absender: {
    name: string
    adresse: string
    aktenzeichen: string
  }
  behoerde: string
  leistung_name: string
  ablehnungsdatum: string
  begruendung_widerspruch: string
}

/**
 * Generiert einen vollstaendigen deutschen Widerspruchs-Musterbrief
 * gemaess §84 SGG (Sozialgerichtsgesetz).
 */
export function generiereWiderspruchText(params: WiderspruchParams): string {
  const heute = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const { absender, behoerde, leistung_name, ablehnungsdatum, begruendung_widerspruch } = params

  return `${absender.name}
${absender.adresse}

${behoerde}


Datum: ${heute}
Aktenzeichen: ${absender.aktenzeichen}


WIDERSPRUCH
gegen den Bescheid vom ${ablehnungsdatum} (Az.: ${absender.aktenzeichen})
betreffend: ${leistung_name}


Sehr geehrte Damen und Herren,

gegen Ihren Bescheid vom ${ablehnungsdatum} lege ich hiermit fristgerecht
WIDERSPRUCH ein.

Ich beantrage:

1. Den angefochtenen Bescheid aufzuheben und mir die beantragte Leistung
   (${leistung_name}) unverzueglich zu gewaehren.

2. Die Kosten des Widerspruchsverfahrens mir gegenueber nicht zu erheben,
   hilfsweise diese der Behoerde aufzuerlegen.


BEGRUENDUNG:

${begruendung_widerspruch}


Ich bitte Sie, mir den Eingang dieses Widerspruchs schriftlich zu bestaetigen
und mir Ihren Widerspruchsbescheid zuzustellen.

Sollten Sie meinem Widerspruch nicht abhelfen, bitte ich um vollstaendige
Uebersendung der Akten an die Widerspruchsbehoerde.

Ich behalte mir vor, den Widerspruch zu erweiterieren und weitere
Beweismittel nachzureichen.


Mit freundlichen Gruessen,

${absender.name}


---
Hinweis: Dieser Brief wurde als Vorlage generiert. Bitte pruefen Sie alle
Angaben sorgfaeltig und ersetzen Sie ggf. durch Ihre spezifischen Angaben.
Widerspruchsfrist: 4 Wochen ab Zugang des Bescheids (§84 SGG).
Bei Fragen wenden Sie sich an einen Sozialrechtsberater oder den VdK.`
}

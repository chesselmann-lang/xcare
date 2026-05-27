// §40 SGB XI 2026 – Monatliches Budget fuer zum Verbrauch bestimmte Pflegehilfsmittel

export const MONATLICHES_BUDGET_CENT = 4000 // 40 EUR

export interface BudgetBerechnung {
  monat: string                       // "2026-05"
  budget_gesamt: number               // 4000
  ausgaben_erstattungsfaehig: number  // Summe erstatteter Betraege
  ausgaben_eigenanteil: number        // Summe Eigenanteile
  budget_verbleibend: number          // verbleibend im Monat
  jahresbudget_verbleibend: number    // kann innerhalb des Jahres uebertragen werden
}

interface AusgabeInput {
  preis_cent: number
  erstattet_cent: number
  monat: string
  hilfsmittel: {
    erstattungsfaehig: boolean
    erstattung_typ: string
  }
}

/**
 * Berechnet das monatliche §40-Budget und den Eigenanteil.
 * Nur Verbrauchsprodukte fliessen in das §40-Budget ein.
 */
export function berechneBudget(ausgaben: AusgabeInput[]): BudgetBerechnung {
  // Nur den ersten Monat aus den Daten ableiten (Aufrufer filtert vorab)
  const monat = ausgaben[0]?.monat
    ? ausgaben[0].monat.slice(0, 7)
    : new Date().toISOString().slice(0, 7)

  let ausgaben_erstattungsfaehig = 0
  let ausgaben_eigenanteil = 0

  for (const a of ausgaben) {
    if (a.hilfsmittel.erstattungsfaehig && istVerbrauchshilfsmittel(a.hilfsmittel.erstattung_typ)) {
      ausgaben_erstattungsfaehig += a.erstattet_cent ?? 0
      ausgaben_eigenanteil += Math.max(0, (a.preis_cent ?? 0) - (a.erstattet_cent ?? 0))
    } else {
      ausgaben_eigenanteil += a.preis_cent ?? 0
    }
  }

  const budget_verbleibend = Math.max(0, MONATLICHES_BUDGET_CENT - ausgaben_erstattungsfaehig)

  // Vereinfachte Jahresberechnung: restliche Monate * Monatsbudget
  const [year, month] = monat.split('-').map(Number)
  const restMonate = 12 - month
  const jahresbudget_verbleibend = budget_verbleibend + restMonate * MONATLICHES_BUDGET_CENT

  return {
    monat,
    budget_gesamt: MONATLICHES_BUDGET_CENT,
    ausgaben_erstattungsfaehig,
    ausgaben_eigenanteil,
    budget_verbleibend,
    jahresbudget_verbleibend,
  }
}

/** PG-Nummer formatiert darstellen */
export const PG_BEZEICHNUNGEN: Record<string, string> = {
  '11': 'Kompressionsstrümpfe',
  '18': 'Pflegebetten',
  '22': 'Gehhilfen',
  '26': 'Badehilfen',
  '50': 'Orthesen',
  '51': 'Pflegehilfsmittel zum Verbrauch',
  '54': 'Inkontinenzmaterial',
  '99': 'Sonstiges',
}

export function formatPGNummer(pg: string): string {
  const bezeichnung = PG_BEZEICHNUNGEN[pg]
  return bezeichnung ? `PG ${pg} – ${bezeichnung}` : `PG ${pg}`
}

/** Prueft ob Produkt ein Verbrauchshilfsmittel nach §40 SGB XI ist */
export function istVerbrauchshilfsmittel(erstattungTyp: string): boolean {
  return erstattungTyp === 'verbrauch'
}

/** Formatierten Antragtext fuer PDF-Download generieren */
export function generiereAntragText(params: {
  nutzer: {
    name: string
    geburtsdatum: string
    adresse: string
    krankenkasse: string
  }
  hilfsmittel: {
    name: string
    pg_nummer: string
    hilfsmittel_nummer?: string
  }
  pflegegrad: number
  arzt: {
    name: string
    lanr?: string
  }
}): string {
  const { nutzer, hilfsmittel, pflegegrad, arzt } = params
  const datum = new Date().toLocaleDateString('de-DE')
  const pgFormatiert = formatPGNummer(hilfsmittel.pg_nummer)

  return `ANTRAG AUF VERSORGUNG MIT PFLEGEHILFSMITTELN
nach § 40 SGB XI

Datum: ${datum}

ANTRAGSTELLER/IN
Name:           ${nutzer.name}
Geburtsdatum:   ${nutzer.geburtsdatum}
Adresse:        ${nutzer.adresse}
Krankenkasse:   ${nutzer.krankenkasse}
Pflegegrad:     ${pflegegrad}

BEANTRAGTE HILFSMITTEL
Bezeichnung:             ${hilfsmittel.name}
Produktgruppe:           ${pgFormatiert}${hilfsmittel.hilfsmittel_nummer ? `
Hilfsmittelnummer:       ${hilfsmittel.hilfsmittel_nummer}` : ''}

VERORDNENDE AERZTIN / VERORDNENDER ARZT
Name:           ${arzt.name}${arzt.lanr ? `
LANR:           ${arzt.lanr}` : ''}

BEGRUENDUNG
Ich beantrage die Versorgung mit dem oben genannten Pflegehilfsmittel
gemaess § 40 SGB XI. Die Notwendigkeit ergibt sich aus meinem
anerkannten Pflegegrad ${pflegegrad} und der aerztlichen Empfehlung.

Das monatliche Budget fuer Verbrauchspflegehilfsmittel betraegt
gemaess § 40 Abs. 2 SGB XI derzeit 40,00 EUR.

Mit freundlichen Gruessen,

${nutzer.name}
(Unterschrift)

-----------------------------------------------------
Dieses Dokument wurde mit xcare erstellt.
xcare ist kein Ersatz fuer rechtliche oder medizinische Beratung.
`
}

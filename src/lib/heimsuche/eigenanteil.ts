// ============================================================
// F28: Eigenanteil-Rechner
// §43 SGB XI 2026 — Pflegeversicherungsleistungen bei vollstationärer Pflege
// ============================================================

/** §43 SGB XI 2026 — Pflegekassenzuschuss nach Pflegegrad (in Cent) */
export const PFLEGEKASSE_LEISTUNG_CENT: Record<number, number> = {
  1: 0,       // PG1: kein Anspruch auf vollstationäre Pflegeleistungen
  2: 77000,   // PG2: 770 EUR
  3: 126200,  // PG3: 1.262 EUR
  4: 177500,  // PG4: 1.775 EUR
  5: 200500,  // PG5: 2.005 EUR
}

/** §90 SGB XII — Schonvermögen (2026) */
export const SCHONVERMOEGEN_SINGLE_CENT = 1000000  // 10.000 EUR
export const SCHONVERMOEGEN_PAAR_CENT   = 2000000  // 20.000 EUR

/**
 * Einkommensfreibetrag für den Lebensunterhalt (grober Richtwert §82 SGB XII).
 * Exakter Betrag hängt von Regelsatz + KdU ab — hier Pauschalwert 2026.
 */
const EINKOMMENSFREIBETRAG_CENT = 85800  // ca. 858 EUR/Monat

export interface EigenanteilBerechnung {
  /** Gesamtkosten des Heims (4 Komponenten summiert) */
  heim_eigenanteil_gesamt: number
  /** Pflegekassenzuschuss §43 SGB XI nach Pflegegrad */
  pflegekasse_leistung: number
  /** Tatsächlich vom Bewohner zu zahlender Eigenanteil */
  zu_zahlender_eigenanteil: number
  /** Anrechenbares monatliches Einkommen nach Freibetrag */
  einkommen_anrechenbar: number
  /** Anrechenbares Vermögen über Schonvermögensgrenze */
  vermoegen_anrechenbar: number
  /** true, wenn Einkommen + Vermögen den Eigenanteil nicht decken */
  sozialhilfe_anspruch: boolean
  /** Monatlicher Sozialhilfebetrag, den das Sozialamt übernimmt */
  sozialhilfe_betrag: number
  /**
   * §35a EStG Steuerermäßigung: 20 % der haushaltsnahen Aufwendungen
   * (Unterkunft + Verpflegung, max. 20.000 EUR Aufwand → max. 4.000 EUR/Jahr)
   * Hier: monatliche Schätzung.
   */
  steuerersparnis_35a: number
  /** Effektive Netto-Monatsbelastung nach Pflegekasse + §35a-Vorteil */
  nettobelastung_cent: number
}

export function berechneEigenanteil(params: {
  pflegegrad: number
  heim_eigenanteil_pflegekosten_cent: number
  heim_unterkunft_cent: number
  heim_verpflegung_cent: number
  heim_investition_cent: number
  einkommen_monatlich_cent: number
  vermoegen_cent: number
}): EigenanteilBerechnung {
  const {
    pflegegrad,
    heim_eigenanteil_pflegekosten_cent,
    heim_unterkunft_cent,
    heim_verpflegung_cent,
    heim_investition_cent,
    einkommen_monatlich_cent,
    vermoegen_cent,
  } = params

  // Gesamtkosten
  const heim_eigenanteil_gesamt =
    heim_eigenanteil_pflegekosten_cent +
    heim_unterkunft_cent +
    heim_verpflegung_cent +
    heim_investition_cent

  // Pflegekassenleistung §43 SGB XI
  const pflegekasse_leistung = PFLEGEKASSE_LEISTUNG_CENT[pflegegrad] ?? 0

  // Zu zahlender Eigenanteil
  const zu_zahlender_eigenanteil = Math.max(0, heim_eigenanteil_gesamt - pflegekasse_leistung)

  // Einkommen: Freibetrag für persönlichen Bedarf abziehen
  const einkommen_anrechenbar = Math.max(0, einkommen_monatlich_cent - EINKOMMENSFREIBETRAG_CENT)

  // Vermögen: Schonvermögen abziehen
  const vermoegen_anrechenbar = Math.max(0, vermoegen_cent - SCHONVERMOEGEN_SINGLE_CENT)

  // Kann der Bewohner den Eigenanteil selbst tragen?
  // Annnahme: Vermögen wird über 12 Monate aufgeteilt (vereinfacht)
  const monatlich_aus_vermoegen = Math.round(vermoegen_anrechenbar / 12)
  const leistungsfaehigkeit = einkommen_anrechenbar + monatlich_aus_vermoegen

  const sozialhilfe_anspruch = leistungsfaehigkeit < zu_zahlender_eigenanteil
  const sozialhilfe_betrag = sozialhilfe_anspruch
    ? Math.max(0, zu_zahlender_eigenanteil - leistungsfaehigkeit)
    : 0

  // §35a EStG: 20 % von Unterkunft + Verpflegung (monatlich)
  // Jährliches Limit: max. Aufwand 20.000 EUR → max. Steuerersparnis 4.000 EUR/Jahr = 333 EUR/Monat
  const aufwand_35a = heim_unterkunft_cent + heim_verpflegung_cent
  const steuerersparnis_35a_roh = Math.round(aufwand_35a * 0.2)
  const MAX_MONATSERSPARNIS_35A = 33300 // 333 EUR
  const steuerersparnis_35a = Math.min(steuerersparnis_35a_roh, MAX_MONATSERSPARNIS_35A)

  const nettobelastung_cent = Math.max(0, zu_zahlender_eigenanteil - steuerersparnis_35a)

  return {
    heim_eigenanteil_gesamt,
    pflegekasse_leistung,
    zu_zahlender_eigenanteil,
    einkommen_anrechenbar,
    vermoegen_anrechenbar,
    sozialhilfe_anspruch,
    sozialhilfe_betrag,
    steuerersparnis_35a,
    nettobelastung_cent,
  }
}

// ============================================================
// Formatting helpers
// ============================================================

function centToEuro(cent: number): string {
  return (cent / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

export function formatMonatlicheKosten(berechnung: EigenanteilBerechnung): string {
  const lines: string[] = [
    `Gesamtkosten Heim:       ${centToEuro(berechnung.heim_eigenanteil_gesamt)}/Monat`,
    `– Pflegekasse (§43):    −${centToEuro(berechnung.pflegekasse_leistung)}/Monat`,
    `= Ihr Eigenanteil:       ${centToEuro(berechnung.zu_zahlender_eigenanteil)}/Monat`,
    ``,
    `§35a Steuerersparnis:   −${centToEuro(berechnung.steuerersparnis_35a)}/Monat`,
    `= Netto-Belastung:       ${centToEuro(berechnung.nettobelastung_cent)}/Monat`,
  ]
  if (berechnung.sozialhilfe_anspruch) {
    lines.push(``)
    lines.push(`Sozialhilfe (§65 SGB XII): ${centToEuro(berechnung.sozialhilfe_betrag)}/Monat möglich`)
  }
  return lines.join('\n')
}

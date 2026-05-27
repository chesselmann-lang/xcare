// ============================================================
// F31: Pflege-Finanzplaner — Steuerberechnungs-Engine
// Deterministic tax logic for German care cost deductions
// Sources: §35a EStG, §33 EStG, §33b Abs.6 EStG (2024+)
// ============================================================

// ── Constants ──────────────────────────────────────────────────────────────────

/** §35a EStG: Steuerermäßigung 20% auf haushaltsnahe Dienstleistungen */
export const PARA35A_SATZ = 0.20

/** §35a EStG: Maximale Steuerminderung pro Jahr (4.000 EUR in Cent) */
export const PARA35A_MAX_CENT = 400_000

/** §35a EStG: Maximale Bemessungsgrundlage (20.000 EUR in Cent) */
export const PARA35A_BASIS_MAX_CENT = 2_000_000

/** Pflegepauschbetrag §33b Abs. 6 EStG (Werte ab 2021, Stand 2024) */
export const PFLEGEPAUSCHBETRAG: Record<number, number> = {
  2: 60_000,   // PG 2: 600 EUR
  3: 110_000,  // PG 3: 1.100 EUR
  4: 180_000,  // PG 4: 1.800 EUR
  5: 180_000,  // PG 5: 1.800 EUR
}

/**
 * §35a-fähige Kategorien (haushaltsnahe Dienstleistungen / Pflege im Haushalt).
 * Voraussetzung: Rechnung + unbare Zahlung (kein Bargeld).
 */
export const PARA35A_KATEGORIEN: ReadonlyArray<string> = [
  'ambulante_pflege',
  'haushaltshilfe',
  'tagespflege',
  'verhinderungspflege',
]

/**
 * §33-fähige Kategorien (außergewöhnliche Belastungen / medizinische Kosten).
 * Abzüglich Zumutbarkeitsgrenze — hier nur Bruttoschätzung.
 */
export const PARA33_KATEGORIEN: ReadonlyArray<string> = [
  'ambulante_pflege',
  'stationaere_pflege',
  'medikamente',
  'fahrtkosten',
  'hilfsmittel',
  'kurzzeitpflege',
]

/** Minijob-Grenze 2024 (538 EUR / Monat in Cent) */
export const MINIJOB_GRENZE_CENT = 53_800

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AusgabeInput {
  kategorie: string
  betrag_cent: number
  erstattung_kasse_cent: number
  erstattung_sonstige_cent: number
}

export interface SteuerBerechnung {
  jahr: number
  gesamtausgaben_cent: number
  erstattungen_cent: number
  eigenanteil_cent: number
  /** Net §35a basis (after deducting refunds, capped at 20k EUR) */
  para35a_basis_cent: number
  /** 20% of basis, capped at 4k EUR — direct tax reduction (not deduction!) */
  para35a_steuerminderung_cent: number
  /** §33b Pflegepauschbetrag flat lump sum (if pflegegrad >= 2) */
  para33b_pflegepauschbetrag_cent: number
  /** Gross §33 eligible costs (net of refunds, before Zumutbarkeitsgrenze) */
  para33_aussergew_belastung_cent: number
  /** Sum of all estimated tax savings */
  gesamte_steuerersparnis_cent: number
  hinweise: string[]
}

export interface MonatsKosten {
  monat: string // "2026-05"
  ausgaben_cent: number
  erstattungen_cent: number
  eigenanteil_cent: number
  /** Rough estimate: eigenanteil minus 20% §35a benefit */
  nach_steuer_cent: number
}

export interface MinijobPruefung {
  ist_minijob: boolean
  /** Approx. employer flat-rate contributions (~24.3% for Minijob) */
  arbeitgeber_pauschalbeitrag_cent: number
  steuerlich_absetzbar: boolean
  warnung: string | null
}

// ── Core calculation ───────────────────────────────────────────────────────────

/**
 * Berechnet alle steuerlichen Vorteile für ein Kalenderjahr.
 *
 * Wichtig: §35a und §33 schließen sich für dieselbe Ausgabe nicht aus,
 * aber §33 Abzug wird erst nach der Zumutbarkeitsgrenze wirksam.
 * Diese Funktion schätzt den §33-Betrag (brutto, ohne Zumutbarkeitsgrenze),
 * da die Zumutbarkeitsgrenze vom Gesamteinkommen abhängt (unbekannt hier).
 */
export function berechneSteuervorteile(params: {
  ausgaben: AusgabeInput[]
  pflegegrad: number
  jahr: number
  ist_pflegeperson: boolean
}): SteuerBerechnung {
  const { ausgaben, pflegegrad, jahr, ist_pflegeperson } = params
  const hinweise: string[] = []

  // ── Gesamtbeträge ──
  const gesamtausgaben_cent = ausgaben.reduce((s, a) => s + a.betrag_cent, 0)
  const erstattungen_cent = ausgaben.reduce(
    (s, a) => s + a.erstattung_kasse_cent + a.erstattung_sonstige_cent,
    0
  )
  const eigenanteil_cent = Math.max(0, gesamtausgaben_cent - erstattungen_cent)

  // ── §35a EStG: Haushaltsnahe Dienstleistungen ──
  const para35a_ausgaben = ausgaben.filter(a => PARA35A_KATEGORIEN.includes(a.kategorie))
  const para35a_brutto = para35a_ausgaben.reduce((s, a) => s + a.betrag_cent, 0)
  const para35a_erstattungen = para35a_ausgaben.reduce(
    (s, a) => s + a.erstattung_kasse_cent + a.erstattung_sonstige_cent,
    0
  )
  // Net cost, capped at 20k EUR basis
  const para35a_netto = Math.max(0, para35a_brutto - para35a_erstattungen)
  const para35a_basis_cent = Math.min(para35a_netto, PARA35A_BASIS_MAX_CENT)
  const para35a_steuerminderung_cent = Math.min(
    Math.round(para35a_basis_cent * PARA35A_SATZ),
    PARA35A_MAX_CENT
  )

  if (para35a_basis_cent > 0) {
    hinweise.push(
      `§35a EStG: ${formatEur(para35a_basis_cent)} Bemessungsgrundlage → ${formatEur(para35a_steuerminderung_cent)} direkte Steuerminderung (20%, max. 4.000 €). ` +
      `Voraussetzung: Zahlung per Überweisung/Karte (kein Bargeld) und Rechnung des Anbieters.`
    )
  }

  // ── §33b Abs. 6 EStG: Pflegepauschbetrag ──
  let para33b_pflegepauschbetrag_cent = 0
  if (ist_pflegeperson && pflegegrad >= 2) {
    para33b_pflegepauschbetrag_cent = PFLEGEPAUSCHBETRAG[pflegegrad] ?? 0
    hinweise.push(
      `§33b Abs. 6 EStG: Pflegepauschbetrag ${formatEur(para33b_pflegepauschbetrag_cent)} für Pflegegrad ${pflegegrad}. ` +
      `Gilt für pflegende Angehörige ohne Entgelt. Pauschbetrag mindert die Steuerlast direkt.`
    )
  } else if (!ist_pflegeperson && pflegegrad >= 2) {
    hinweise.push(
      `§33b Pflegepauschbetrag: Nur für pflegende Angehörige ohne Vergütung. ` +
      `Falls Sie selbst pflegen, können Sie ${formatEur(PFLEGEPAUSCHBETRAG[pflegegrad] ?? 0)} als Pauschbetrag geltend machen.`
    )
  }

  // ── §33 EStG: Außergewöhnliche Belastungen ──
  const para33_ausgaben = ausgaben.filter(a => PARA33_KATEGORIEN.includes(a.kategorie))
  const para33_brutto = para33_ausgaben.reduce((s, a) => s + a.betrag_cent, 0)
  const para33_erstattungen = para33_ausgaben.reduce(
    (s, a) => s + a.erstattung_kasse_cent + a.erstattung_sonstige_cent,
    0
  )
  const para33_aussergew_belastung_cent = Math.max(0, para33_brutto - para33_erstattungen)

  if (para33_aussergew_belastung_cent > 0) {
    hinweise.push(
      `§33 EStG: ${formatEur(para33_aussergew_belastung_cent)} außergewöhnliche Belastungen (vor Zumutbarkeitsgrenze). ` +
      `Die tatsächliche Steuerminderung hängt von Ihrem Einkommen und der Zumutbarkeitsgrenze ab — bitte mit dem Steuerberater klären.`
    )
  }

  // ── Vollständigkeitshinweise ──
  if (para35a_brutto > 0 && para35a_erstattungen > 0) {
    hinweise.push(
      `Kassenerstattungen (${formatEur(para35a_erstattungen)}) wurden von der §35a-Bemessungsgrundlage abgezogen.`
    )
  }
  if (pflegegrad < 2) {
    hinweise.push(
      `Pflegegrad 0 oder 1: Kein Pflegepauschbetrag (§33b). Prüfen Sie, ob eine Neueinstufung möglich ist.`
    )
  }
  if (para35a_steuerminderung_cent >= PARA35A_MAX_CENT) {
    hinweise.push(
      `§35a-Maximum (4.000 €) erreicht. Höhere Ausgaben in dieser Kategorie bringen keine weitere Steuerminderung.`
    )
  }

  // ── Gesamte geschätzte Steuerersparnis ──
  // §33-Wert ist unsicher (Zumutbarkeitsgrenze unbekannt), daher nur 50% Schätzung
  const para33_geschaetzt_cent = Math.round(para33_aussergew_belastung_cent * 0.3)
  const gesamte_steuerersparnis_cent =
    para35a_steuerminderung_cent + para33b_pflegepauschbetrag_cent + para33_geschaetzt_cent

  return {
    jahr,
    gesamtausgaben_cent,
    erstattungen_cent,
    eigenanteil_cent,
    para35a_basis_cent,
    para35a_steuerminderung_cent,
    para33b_pflegepauschbetrag_cent,
    para33_aussergew_belastung_cent,
    gesamte_steuerersparnis_cent,
    hinweise,
  }
}

// ── Monthly overview ───────────────────────────────────────────────────────────

interface AusgabeMitDatum extends AusgabeInput {
  datum: string
}

/**
 * Aggregiert Ausgaben pro Kalendermonat, sortiert aufsteigend.
 */
export function berechneMonatsuebersicht(ausgaben: AusgabeMitDatum[]): MonatsKosten[] {
  const map = new Map<string, MonatsKosten>()

  for (const a of ausgaben) {
    const monat = a.datum.slice(0, 7) // "2026-05"
    if (!map.has(monat)) {
      map.set(monat, {
        monat,
        ausgaben_cent: 0,
        erstattungen_cent: 0,
        eigenanteil_cent: 0,
        nach_steuer_cent: 0,
      })
    }
    const m = map.get(monat)!
    m.ausgaben_cent += a.betrag_cent
    m.erstattungen_cent += a.erstattung_kasse_cent + a.erstattung_sonstige_cent
    m.eigenanteil_cent = Math.max(0, m.ausgaben_cent - m.erstattungen_cent)
    // Rough monthly estimate: subtract 1/12 of annual §35a benefit
    const para35a_monatlich = PARA35A_MAX_CENT / 12
    m.nach_steuer_cent = Math.max(0, m.eigenanteil_cent - para35a_monatlich)
  }

  return Array.from(map.values()).sort((a, b) => a.monat.localeCompare(b.monat))
}

// ── Minijob checker ────────────────────────────────────────────────────────────

/**
 * Prüft ob ein Monatslohn als Minijob gilt und berechnet Arbeitgeber-Pauschalbeiträge.
 * Minijob-Grenze 2024: 538 EUR/Monat.
 * AG-Pauschale: ~24,9% (KV 13%, RV 15%, Pauschsteuer 2%, U1/U2/Insolvenzumlage ~2,9%)
 * Vereinfacht: ~131 EUR bei 538 EUR.
 */
export function pruefeMinijobStatus(monatslohn_cent: number): MinijobPruefung {
  const ist_minijob = monatslohn_cent <= MINIJOB_GRENZE_CENT

  // AG Pauschalbeitrag ~24.3% für Minijob (gerundet)
  const arbeitgeber_pauschalbeitrag_cent = ist_minijob
    ? Math.round(monatslohn_cent * 0.243)
    : 0

  let warnung: string | null = null
  if (!ist_minijob) {
    const ueber_cent = monatslohn_cent - MINIJOB_GRENZE_CENT
    warnung =
      `Achtung: Der Lohn überschreitet die Minijob-Grenze um ${formatEur(ueber_cent)}. ` +
      `Ab 538,01 €/Monat besteht Sozialversicherungspflicht — prüfen Sie Midijob oder reguläres Arbeitsverhältnis.`
  }

  return {
    ist_minijob,
    arbeitgeber_pauschalbeitrag_cent,
    steuerlich_absetzbar: ist_minijob,
    warnung,
  }
}

// ── Steuerberater-Bericht ──────────────────────────────────────────────────────

interface BerichtAusgabe {
  datum: string
  kategorie: string
  bezeichnung: string
  betrag_cent: number
  erstattung_kasse_cent: number
  erstattung_sonstige_cent: number
  belegnummer?: string
}

const KATEGORIE_LABEL: Record<string, string> = {
  ambulante_pflege: 'Ambulante Pflege',
  stationaere_pflege: 'Stationäre Pflege',
  hilfsmittel: 'Hilfsmittel',
  medikamente: 'Medikamente',
  haushaltshilfe: 'Haushaltshilfe',
  fahrtkosten: 'Fahrtkosten',
  umbaumassnahmen: 'Umbaumaßnahmen',
  kurzzeitpflege: 'Kurzzeitpflege',
  tagespflege: 'Tagespflege',
  verhinderungspflege: 'Verhinderungspflege',
  sonstiges: 'Sonstiges',
}

/**
 * Erzeugt einen strukturierten Textbericht für den Steuerberater.
 */
export function generiereSteuerbericht(params: {
  ausgaben: BerichtAusgabe[]
  jahr: number
  pflegegrad: number
}): string {
  const { ausgaben, jahr, pflegegrad } = params
  const jetzt = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const lines: string[] = [
    `PFLEGEKOSTEN-BERICHT FÜR STEUERJAHR ${jahr}`,
    `Erstellt am: ${jetzt}  |  Pflegegrad: ${pflegegrad}`,
    '='.repeat(60),
    '',
  ]

  // Group by category
  const grouped = new Map<string, BerichtAusgabe[]>()
  for (const a of ausgaben) {
    if (!grouped.has(a.kategorie)) grouped.set(a.kategorie, [])
    grouped.get(a.kategorie)!.push(a)
  }

  let gesamtBrutto = 0
  let gesamtErstattung = 0

  for (const [kategorie, posten] of grouped.entries()) {
    const label = KATEGORIE_LABEL[kategorie] ?? kategorie
    const isPara35a = PARA35A_KATEGORIEN.includes(kategorie)
    const isPara33  = PARA33_KATEGORIEN.includes(kategorie)
    const paragraphen = [isPara35a && '§35a', isPara33 && '§33'].filter(Boolean).join(', ')

    lines.push(`── ${label.toUpperCase()}${paragraphen ? ` [${paragraphen}]` : ''} ──`)

    let kategorieSum = 0
    let kategorieErstattung = 0

    for (const p of posten.sort((a, b) => a.datum.localeCompare(b.datum))) {
      const netto = p.betrag_cent - p.erstattung_kasse_cent - p.erstattung_sonstige_cent
      const erstattungStr =
        p.erstattung_kasse_cent + p.erstattung_sonstige_cent > 0
          ? ` (Erstattung: -${formatEur(p.erstattung_kasse_cent + p.erstattung_sonstige_cent)})`
          : ''
      const belegStr = p.belegnummer ? ` [Beleg: ${p.belegnummer}]` : ''
      lines.push(
        `  ${formatDatum(p.datum)}  ${p.bezeichnung.padEnd(32)} ${formatEur(p.betrag_cent).padStart(10)}${erstattungStr}${belegStr}`
      )
      kategorieSum += p.betrag_cent
      kategorieErstattung += p.erstattung_kasse_cent + p.erstattung_sonstige_cent
    }

    const kategorieNetto = kategorieSum - kategorieErstattung
    lines.push(`  Kategorie-Summe: ${formatEur(kategorieSum)} brutto  |  Netto nach Erstattung: ${formatEur(kategorieNetto)}`)
    lines.push('')

    gesamtBrutto += kategorieSum
    gesamtErstattung += kategorieErstattung
  }

  const eigenanteil = gesamtBrutto - gesamtErstattung
  const berechnung = berechneSteuervorteile({
    ausgaben: ausgaben.map(a => ({
      kategorie: a.kategorie,
      betrag_cent: a.betrag_cent,
      erstattung_kasse_cent: a.erstattung_kasse_cent,
      erstattung_sonstige_cent: a.erstattung_sonstige_cent,
    })),
    pflegegrad,
    jahr,
    ist_pflegeperson: pflegegrad >= 2,
  })

  lines.push('='.repeat(60))
  lines.push('ZUSAMMENFASSUNG')
  lines.push('='.repeat(60))
  lines.push(`Gesamtausgaben (brutto):         ${formatEur(gesamtBrutto)}`)
  lines.push(`Erstattungen gesamt:             -${formatEur(gesamtErstattung)}`)
  lines.push(`Eigenanteil (netto):              ${formatEur(eigenanteil)}`)
  lines.push('')
  lines.push('STEUERLICHE OPTIMIERUNG (Schätzung)')
  lines.push('-'.repeat(40))
  lines.push(`§35a EStG Bemessungsgrundlage:   ${formatEur(berechnung.para35a_basis_cent)}`)
  lines.push(`§35a EStG Steuerminderung (20%): ${formatEur(berechnung.para35a_steuerminderung_cent)}`)
  if (berechnung.para33b_pflegepauschbetrag_cent > 0) {
    lines.push(`§33b Pflegepauschbetrag:         ${formatEur(berechnung.para33b_pflegepauschbetrag_cent)}`)
  }
  lines.push(`§33 Außergewöhnl. Belastungen:   ${formatEur(berechnung.para33_aussergew_belastung_cent)} (vor Zumutbarkeitsgrenze)`)
  lines.push(`Geschätzte Steuerersparnis ges.: ~${formatEur(berechnung.gesamte_steuerersparnis_cent)}`)
  lines.push('')
  lines.push('HINWEISE')
  lines.push('-'.repeat(40))
  for (const h of berechnung.hinweise) {
    lines.push(`• ${h}`)
  }
  lines.push('')
  lines.push('─'.repeat(60))
  lines.push('Dieser Bericht wurde maschinell erstellt (xcare Pflege-Finanzplaner).')
  lines.push('Bitte mit Ihrem Steuerberater abstimmen — insbesondere Zumutbarkeitsgrenze')
  lines.push('(§33 EStG), Einzelnachweis-Pflicht und aktuelle Rechtslage.')

  return lines.join('\n')
}

// ── Formatting helpers ─────────────────────────────────────────────────────────

function formatEur(cent: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(cent / 100)
}

function formatDatum(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

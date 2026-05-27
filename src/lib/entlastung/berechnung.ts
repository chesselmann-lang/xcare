// ============================================================
// §45b SGB XI — Entlastungsleistungs-Tracker Berechnungslogik
// ============================================================

export const MONATLICHES_BUDGET_CENT = 12500  // 125,00 €
export const JAHRESBUDGET_CENT = 150000        // 1.500,00 €

// ─── Leistungsarten ───────────────────────────────────────────────────────────

export interface Leistungsart {
  id: string
  label: string
  beschreibung: string
  icon: string
}

export const LEISTUNGSARTEN: Leistungsart[] = [
  {
    id: 'tagespflege',
    label: 'Tagespflege',
    beschreibung: 'Ambulante Tagespflege in einer Einrichtung',
    icon: '🏠',
  },
  {
    id: 'kurzzeit',
    label: 'Kurzzeitpflege',
    beschreibung: 'Vorübergehende vollstationäre Pflege (§42 SGB XI)',
    icon: '🏥',
  },
  {
    id: 'verhinderungspflege',
    label: 'Verhinderungspflege',
    beschreibung: 'Ersatzpflege bei Verhinderung der Pflegeperson (§39 SGB XI)',
    icon: '🔄',
  },
  {
    id: 'hilfsmittel',
    label: 'Pflegehilfsmittel',
    beschreibung: 'Zum Verbrauch bestimmte Pflegehilfsmittel (§40 SGB XI)',
    icon: '🩺',
  },
  {
    id: 'ambulante_pflege',
    label: 'Ambulante Pflegeleistungen',
    beschreibung: 'Betreuungs- und Entlastungsleistungen anerkannter Dienste (§45a SGB XI)',
    icon: '👐',
  },
  {
    id: 'sonstiges',
    label: 'Sonstiges',
    beschreibung: 'Weitere anerkannte Entlastungsangebote',
    icon: '📋',
  },
]

// ─── Typen ────────────────────────────────────────────────────────────────────

export interface MonatsUebersicht {
  monat: number
  monatName: string
  budgetCent: number
  genutztCent: number
  restCent: number
  eintraege: EntlastungsNutzung[]
}

export interface EntlastungsNutzung {
  id: string
  user_id: string
  jahr: number
  monat: number
  betrag_cent: number
  leistungsart: string
  anbieter: string | null
  belegnummer: string | null
  notiz: string | null
  erstattung_beantragt: boolean
  erstattung_erhalten: boolean
  erstellt_am: string
}

export interface JahresuebersichtErgebnis {
  genutzt: number
  rest: number
  uebertrag: number
  monate: MonatsUebersicht[]
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

const MONAT_NAMEN = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

export function getMonatName(monat: number): string {
  return MONAT_NAMEN[(monat - 1) % 12] ?? `Monat ${monat}`
}

export function formatBetrag(cent: number): string {
  return (cent / 100).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €'
}

/**
 * Berechnet den übertragbaren Betrag ins Folgejahr.
 * Nicht genutztes Budget des laufenden Jahres kann bis zum 30. Juni des Folgejahres
 * in Anspruch genommen werden.
 */
export function berechneUebertrag(vorjahrGenutzt: number, jahresbudget: number): number {
  return Math.max(0, jahresbudget - vorjahrGenutzt)
}

// ─── Hauptberechnung ──────────────────────────────────────────────────────────

/**
 * Erstellt eine vollständige Jahresübersicht mit allen 12 Monaten,
 * berücksichtigt den Übertrag aus dem Vorjahr und berechnet Rest-Budget.
 */
export function berechneJahresuebersicht(
  nutzungen: EntlastungsNutzung[],
  jahresbudget: number,
  uebertrag: number,
): JahresuebersichtErgebnis {
  // Gesamt genutzt im Jahr
  const gesamtGenutzt = nutzungen.reduce((sum, n) => sum + n.betrag_cent, 0)

  // Gesamtbudget inkl. Übertrag
  const gesamtBudget = jahresbudget + uebertrag

  // Restbudget (kann nicht negativ sein)
  const rest = Math.max(0, gesamtBudget - gesamtGenutzt)

  // Erstelle Monatsübersichten für alle 12 Monate
  const monate: MonatsUebersicht[] = Array.from({ length: 12 }, (_, i) => {
    const monatNr = i + 1
    const eintraege = nutzungen.filter(n => n.monat === monatNr)
    const genutztCent = eintraege.reduce((sum, n) => sum + n.betrag_cent, 0)
    const budgetCent = MONATLICHES_BUDGET_CENT

    return {
      monat: monatNr,
      monatName: getMonatName(monatNr),
      budgetCent,
      genutztCent,
      restCent: Math.max(0, budgetCent - genutztCent),
      eintraege,
    }
  })

  return {
    genutzt: gesamtGenutzt,
    rest,
    uebertrag,
    monate,
  }
}

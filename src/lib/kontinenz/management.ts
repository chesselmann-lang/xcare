// F49: Kontinenz-Management & Miktionskalender

export interface KontinenzAssessment {
  id?: string
  user_id?: string
  assessment_datum: string
  iciq_haeufigkeit?: number
  iciq_menge?: number
  iciq_beeintraechtigung?: number
  iciq_gesamt?: number
  inkontinenztyp?: 'stress' | 'drang' | 'misch' | 'ueberlauf' | 'funktionell' | 'unbekannt'
  hilfsmittel?: string[]
  blasentraining?: boolean
  beckenbodentraining?: boolean
  miktionsintervall_min?: number
  bemerkungen?: string
  erstellt_am?: string
}

export interface Miktionseintrag {
  id?: string
  user_id?: string
  zeitpunkt: string
  miktion_ml?: number
  miktion_erfolgt?: boolean
  inkontinenz?: boolean
  inkontinenz_ml_schaetzung?: number // 0-3
  inkontinenz_art?: 'stress' | 'drang' | 'nicht_erreicht' | 'unbekannt'
  einlage_gewechselt?: boolean
  einlage_typ?: string
  trinkmenge_ml?: number
  getraenk?: string
  schmerzen?: boolean
  brennen?: boolean
  bemerkungen?: string
  erstellt_am?: string
}

export interface KontinenzTagesbilanz {
  id?: string
  user_id?: string
  datum: string
  gesamtmenge_ml?: number
  trinkmenge_ml?: number
  inkontinenz_episoden?: number
  einlagen_verbrauch?: number
  notizen?: string
}

export const INKONTINENZTYPEN: Record<string, { label: string; farbe: string; beschreibung: string }> = {
  stress:      { label: 'Belastungsinkontinenz', farbe: 'blue',   beschreibung: 'Harnverlust bei körperlicher Belastung (Husten, Niesen, Sport)' },
  drang:       { label: 'Dranginkontinenz',       farbe: 'orange', beschreibung: 'Plötzlicher, nicht aufschiebbarer Harndrang' },
  misch:       { label: 'Mischinkontinenz',        farbe: 'purple', beschreibung: 'Kombination aus Belastungs- und Dranginkontinenz' },
  ueberlauf:   { label: 'Überlaufinkontinenz',     farbe: 'red',    beschreibung: 'Blase entleert sich unkontrolliert bei Überfüllung' },
  funktionell: { label: 'Funktionelle Inkontinenz',farbe: 'gray',   beschreibung: 'Körperliche oder kognitive Einschränkungen verhindern rechtzeitiges Erreichen der Toilette' },
  unbekannt:   { label: 'Unbekannt',               farbe: 'slate',  beschreibung: 'Typ noch nicht bestimmt' },
}

export const HILFSMITTEL_OPTIONEN = [
  'Saugeinlagen', 'Vorlagen', 'Pants (Windelhosen)', 'Kondomurinal',
  'Dauerkatheter', 'Einmalkatheter', 'Suprapubischer Katheter',
  'Bettschutz-Einlage', 'Urinableitungssystem', 'Toilettenstuhl',
  'Toilettensitzerhöhung', 'Haltegriffe WC',
]

export const ICIQ_HAEUFIGKEIT: Record<number, string> = {
  0: 'Nie',
  1: 'Einmal pro Woche oder seltener',
  2: '2–3 Mal pro Woche',
  3: 'Einmal täglich',
  4: 'Mehrmals täglich',
  5: 'Ständig',
}

export const ICIQ_MENGE: Record<number, string> = {
  0: 'Kein Urinverlust',
  2: 'Wenig (Tropfen)',
  4: 'Mäßig (kleines Schwall)',
  6: 'Viel (großes Schwall)',
}

export const INKONTINENZ_SCHAETZUNG: Record<number, { label: string; ml: string }> = {
  0: { label: 'Keine',  ml: '0 ml' },
  1: { label: 'Wenig',  ml: '≤ 50 ml' },
  2: { label: 'Mittel', ml: '50–200 ml' },
  3: { label: 'Viel',   ml: '> 200 ml' },
}

export function iciqSchweregrad(score: number): { label: string; farbe: string } {
  if (score === 0) return { label: 'Keine Inkontinenz', farbe: 'green' }
  if (score <= 5)  return { label: 'Leicht', farbe: 'lime' }
  if (score <= 12) return { label: 'Mäßig', farbe: 'amber' }
  if (score <= 18) return { label: 'Schwer', farbe: 'orange' }
  return { label: 'Sehr schwer', farbe: 'red' }
}

export function leeresAssessment(): KontinenzAssessment {
  return {
    assessment_datum: new Date().toISOString().split('T')[0],
    iciq_haeufigkeit: 0,
    iciq_menge: 0,
    iciq_beeintraechtigung: 0,
    inkontinenztyp: 'unbekannt',
    hilfsmittel: [],
    blasentraining: false,
    beckenbodentraining: false,
    miktionsintervall_min: 120,
  }
}

export function leerenMiktionseintrag(): Miktionseintrag {
  return {
    zeitpunkt: new Date().toISOString().slice(0, 16),
    miktion_ml: undefined,
    miktion_erfolgt: true,
    inkontinenz: false,
    inkontinenz_ml_schaetzung: 0,
    einlage_gewechselt: false,
    trinkmenge_ml: undefined,
    schmerzen: false,
    brennen: false,
  }
}

export function berechneTagesbilanz(eintraege: Miktionseintrag[]): Partial<KontinenzTagesbilanz> {
  return {
    gesamtmenge_ml: eintraege.reduce((s, e) => s + (e.miktion_ml || 0), 0),
    trinkmenge_ml: eintraege.reduce((s, e) => s + (e.trinkmenge_ml || 0), 0),
    inkontinenz_episoden: eintraege.filter(e => e.inkontinenz).length,
    einlagen_verbrauch: eintraege.filter(e => e.einlage_gewechselt).length,
  }
}

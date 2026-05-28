// F48: Dekubitusprophylaxe & Lagerungsplan — Braden-Skala

export interface BradenAssessment {
  id?: string
  user_id?: string
  assessment_datum: string
  sensorik: number          // 1-4
  feuchtigkeit: number      // 1-4
  aktivitaet: number        // 1-4
  mobilitaet: number        // 1-4
  ernaehrung: number        // 1-4
  reibung_scherkraefte: number // 1-3
  gesamtscore?: number      // computed by DB
  druckentlastung_hilfsmittel?: string[]
  lagerungsintervall_min?: number
  hautpflege_mittel?: string
  ernaehrungs_massnahmen?: string
  massnahmen_freitext?: string
  beurteilende_person?: string
  notizen?: string
  erstellt_am?: string
  aktualisiert_am?: string
}

export interface Lagerungsplan {
  id?: string
  user_id?: string
  plan_datum: string
  bezeichnung: string
  intervall_minuten: number
  positionen: LagerungsPosition[]
  tagesplan: Record<string, string>
  aktiv: boolean
  notizen?: string
  erstellt_am?: string
  aktualisiert_am?: string
}

export interface LagerungsPosition {
  id: string
  name: string
  beschreibung?: string
  dauer_minuten?: number
  emoji: string
}

export interface Lagerungsdokumentation {
  id?: string
  plan_id?: string
  user_id?: string
  durchgefuehrt_am: string
  position: string
  durchgefuehrt_von?: string
  hautbefund?: string
  besonderheiten?: string
  erstellt_am?: string
}

// ── Braden-Skala Kategorien ────────────────────────────────────────────────

export const BRADEN_KATEGORIEN = [
  {
    key: 'sensorik' as keyof BradenAssessment,
    label: 'Wahrnehmungsvermögen',
    icon: '🧠',
    max: 4,
    stufen: [
      { wert: 1, label: 'Komplett eingeschränkt', beschreibung: 'Reagiert nicht auf Schmerzreize; eingeschränkte Fähigkeit Schmerz zu empfinden' },
      { wert: 2, label: 'Stark eingeschränkt', beschreibung: 'Reagiert nur auf Schmerzreize; Kommunikation eingeschränkt durch Bewusstseinstrübung/Sedierung' },
      { wert: 3, label: 'Leicht eingeschränkt', beschreibung: 'Reagiert auf verbale Anweisungen; Einschränkungen durch Sinnesdefizite' },
      { wert: 4, label: 'Nicht eingeschränkt', beschreibung: 'Reagiert auf verbale Anweisungen; keine Sinnesdefizite' },
    ]
  },
  {
    key: 'feuchtigkeit' as keyof BradenAssessment,
    label: 'Feuchtigkeit der Haut',
    icon: '💧',
    max: 4,
    stufen: [
      { wert: 1, label: 'Ständig feucht', beschreibung: 'Haut fast ständig durch Schweiß, Urin o.ä. feucht; Wäsche oft wechseln' },
      { wert: 2, label: 'Oft feucht', beschreibung: 'Haut häufig aber nicht immer feucht; Bettwäsche mind. 1× täglich wechseln' },
      { wert: 3, label: 'Gelegentlich feucht', beschreibung: 'Haut gelegentlich feucht; Wäsche ca. 1× täglich wechseln' },
      { wert: 4, label: 'Selten feucht', beschreibung: 'Haut meist trocken; Wäsche zu routinemäßigen Zeiten wechseln' },
    ]
  },
  {
    key: 'aktivitaet' as keyof BradenAssessment,
    label: 'Aktivität',
    icon: '🏃',
    max: 4,
    stufen: [
      { wert: 1, label: 'Bettlägerig', beschreibung: 'Ans Bett gefesselt' },
      { wert: 2, label: 'An den Rollstuhl gebunden', beschreibung: 'Gehfähigkeit stark eingeschränkt oder nicht vorhanden; kann Rollstuhl nutzen' },
      { wert: 3, label: 'Geht gelegentlich', beschreibung: 'Geht tagsüber gelegentlich kurze Strecken; verbringt meiste Zeit im Bett/Stuhl' },
      { wert: 4, label: 'Geht regelmäßig', beschreibung: 'Geht mind. 2× täglich aus dem Zimmer; mind. alle 2h zu Fuß im Zimmer' },
    ]
  },
  {
    key: 'mobilitaet' as keyof BradenAssessment,
    label: 'Mobilität',
    icon: '🔄',
    max: 4,
    stufen: [
      { wert: 1, label: 'Vollständig immobil', beschreibung: 'Kann ohne Hilfe keine Lageveränderung durchführen' },
      { wert: 2, label: 'Stark eingeschränkt', beschreibung: 'Kann gelegentlich leichte Lageveränderungen des Körpers oder der Extremitäten durchführen' },
      { wert: 3, label: 'Leicht eingeschränkt', beschreibung: 'Führt regelmäßige leichte Lageveränderungen durch' },
      { wert: 4, label: 'Nicht eingeschränkt', beschreibung: 'Führt häufige und ausgiebige Lageveränderungen ohne Hilfe durch' },
    ]
  },
  {
    key: 'ernaehrung' as keyof BradenAssessment,
    label: 'Ernährung',
    icon: '🍽️',
    max: 4,
    stufen: [
      { wert: 1, label: 'Sehr schlechte Ernährung', beschreibung: 'Isst nie eine vollständige Mahlzeit; max. ⅓ der Mahlzeiten; trinkt wenig; erhält keine Sondennahrung' },
      { wert: 2, label: 'Unzureichende Ernährung', beschreibung: 'Isst selten vollständige Mahlzeit; Nahrungsprotein in Form von Fleisch oder Milchprodukten ½ der Menge' },
      { wert: 3, label: 'Angemessene Ernährung', beschreibung: 'Isst mehr als ½ der Mahlzeiten; nimmt mind. 4 Portionen Protein täglich zu sich' },
      { wert: 4, label: 'Ausgezeichnete Ernährung', beschreibung: 'Isst meistens vollständige Mahlzeiten; nimmt mind. 4 Portionen Protein täglich zu sich' },
    ]
  },
  {
    key: 'reibung_scherkraefte' as keyof BradenAssessment,
    label: 'Reibung & Scherkräfte',
    icon: '⚡',
    max: 3,
    stufen: [
      { wert: 1, label: 'Problem', beschreibung: 'Benötigt beim Bewegen mittlere bis starke Hilfe; kompletttes Anheben ohne Schleifspuren unmöglich; rutscht häufig' },
      { wert: 2, label: 'Potenzielles Problem', beschreibung: 'Bewegt sich etwas schwach oder benötigt wenig Hilfe; Haut schleift wahrscheinlich etwas' },
      { wert: 3, label: 'Kein Problem', beschreibung: 'Bewegt sich im Bett und Stuhl selbständig; ausreichend Kraft um sich anzuheben; gleitet nicht' },
    ]
  },
]

export const DRUCKENTLASTUNGS_HILFSMITTEL = [
  'Antidekubitusmatratze (Wechseldrucksystem)',
  'Antidekubitusmatratze (Schaumstoff)',
  'Antidekubituskissen (Rollstuhl)',
  'Fersenschutz/-freistellung',
  'Lagerungskissen (Schaumstoff)',
  'Lagerungskissen (Luftgefüllt)',
  'Lagerungsrollen',
  'Schienenorthese',
  'Mikrolagerung (Keilkissen 30°)',
]

export const STANDARD_POSITIONEN: LagerungsPosition[] = [
  { id: 'ruecken', name: 'Rückenlage', emoji: '🛌', beschreibung: '0° — Rücken flach, Kopf leicht erhöht' },
  { id: 'links30', name: '30° Links', emoji: '↙️', beschreibung: '30° Linksseitenlage (Mikrolagerung)' },
  { id: 'rechts30', name: '30° Rechts', emoji: '↘️', beschreibung: '30° Rechtsseitenlage (Mikrolagerung)' },
  { id: 'links90', name: '90° Links', emoji: '⬅️', beschreibung: '90° Linksseitenlage' },
  { id: 'rechts90', name: '90° Rechts', emoji: '➡️', beschreibung: '90° Rechtsseitenlage' },
  { id: 'bauch', name: 'Bauchlage', emoji: '🫃', beschreibung: 'Bauchlage (wenn toleriert)' },
  { id: 'sitzen', name: 'Sitzen', emoji: '🪑', beschreibung: 'Sitzen im Bett (45-60°)' },
  { id: 'rollstuhl', name: 'Rollstuhl', emoji: '♿', beschreibung: 'Transfer in Rollstuhl' },
]

// ── Braden-Scoring ─────────────────────────────────────────────────────────

export function berechneGesamtscore(a: BradenAssessment): number {
  return a.sensorik + a.feuchtigkeit + a.aktivitaet + a.mobilitaet + a.ernaehrung + a.reibung_scherkraefte
}

export interface BradenRisiko {
  stufe: 'kein' | 'gering' | 'mittel' | 'hoch' | 'sehr_hoch'
  label: string
  farbe: string
  intervall: number // Lagerungsintervall in Minuten
  massnahmen: string[]
}

export function bradenRisiko(score: number): BradenRisiko {
  if (score >= 19) return {
    stufe: 'kein', label: 'Kein Risiko', farbe: '#22c55e', intervall: 240,
    massnahmen: ['Reguläre Hautinspektion', 'Ausreichende Mobilisation fördern']
  }
  if (score >= 15) return {
    stufe: 'gering', label: 'Geringes Risiko', farbe: '#84cc16', intervall: 180,
    massnahmen: ['Regelmäßige Hautinspektion', 'Mobilisation fördern', 'Feuchtigkeitspflege', 'Druckreduzierende Matratze prüfen']
  }
  if (score >= 13) return {
    stufe: 'mittel', label: 'Mittleres Risiko', farbe: '#f59e0b', intervall: 120,
    massnahmen: ['Antidekubitusmatratze', 'Umlagerung alle 2 Stunden', 'Intensivierte Hautpflege', 'Ernährungsoptimierung', 'Fersen freilagern']
  }
  if (score >= 10) return {
    stufe: 'hoch', label: 'Hohes Risiko', farbe: '#ef4444', intervall: 90,
    massnahmen: ['Antidekubitusmatratze (Wechseldruck)', 'Umlagerung alle 1-2 Stunden', 'Arzt informieren', 'Mikrolagerung 30°', 'Wundmanagement einplanen', 'Ernährungsberatung', 'Pflegeplanung anpassen']
  }
  return {
    stufe: 'sehr_hoch', label: 'Sehr hohes Risiko', farbe: '#7c3aed', intervall: 60,
    massnahmen: ['Sofortige Interventionsplanung', 'Wechseldrucksystem', 'Umlagerung stündlich', 'Wundmanagement', 'Ärztliche Anordnung', 'Intensivierte Ernährung (Sondenernährung prüfen)', 'Multidisziplinäres Team einbeziehen']
  }
}

export function leeresBradenAssessment(): BradenAssessment {
  return {
    assessment_datum: new Date().toISOString().split('T')[0],
    sensorik: 4, feuchtigkeit: 4, aktivitaet: 4, mobilitaet: 4,
    ernaehrung: 4, reibung_scherkraefte: 3,
    lagerungsintervall_min: 120,
    druckentlastung_hilfsmittel: []
  }
}

export function leererLagerungsplan(): Lagerungsplan {
  return {
    plan_datum: new Date().toISOString().split('T')[0],
    bezeichnung: 'Lagerungsplan',
    intervall_minuten: 120,
    positionen: STANDARD_POSITIONEN.slice(0, 4),
    tagesplan: generiereTagesplan(120, STANDARD_POSITIONEN.slice(0, 4)),
    aktiv: true
  }
}

export function generiereTagesplan(intervallMin: number, positionen: LagerungsPosition[]): Record<string, string> {
  const plan: Record<string, string> = {}
  if (positionen.length === 0) return plan
  let posIdx = 0
  for (let min = 0; min < 24 * 60; min += intervallMin) {
    const h = Math.floor(min / 60)
    const m = min % 60
    const key = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`
    plan[key] = positionen[posIdx % positionen.length].name
    posIdx++
  }
  return plan
}

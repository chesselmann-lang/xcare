export type Selbstaendigkeitsgrad = 0 | 1 | 2 | 3

export const SELBSTAENDIGKEIT: Record<number, { label: string; farbe: string; short: string }> = {
  0: { label: 'Selbständig', farbe: 'text-green-600', short: 'S' },
  1: { label: 'Überwiegend selbständig', farbe: 'text-yellow-600', short: 'ÜS' },
  2: { label: 'Überwiegend unselbständig', farbe: 'text-orange-600', short: 'ÜU' },
  3: { label: 'Vollständig unselbständig', farbe: 'text-red-600', short: 'U' },
}

export const KOERPERPFLEGE_ARTEN = [
  'Vollbad', 'Dusche', 'Waschen am Waschbecken', 'Teilwäsche', 'Bettbad', 'Haarwäsche'
]

export const HAUTZUSTAND_OPTIONEN = [
  'Normal', 'Trocken', 'Fettig', 'Gerötet', 'Wund', 'Schuppig', 'Pilzbefall', 'Ödematös'
]

export const KOOPERATION_OPTIONEN = [
  { value: 'Gut', farbe: 'bg-green-100 text-green-700' },
  { value: 'Eingeschränkt', farbe: 'bg-yellow-100 text-yellow-700' },
  { value: 'Abweisend', farbe: 'bg-orange-100 text-orange-700' },
  { value: 'Agitiert', farbe: 'bg-red-100 text-red-700' },
]

export const ADL_FELDER: { key: string; label: string; icon: string }[] = [
  { key: 'koerperwaesche', label: 'Körperwäsche', icon: '🚿' },
  { key: 'mundpflege', label: 'Mundpflege', icon: '🦷' },
  { key: 'haarpflege', label: 'Haarpflege', icon: '💈' },
  { key: 'rasur', label: 'Rasur', icon: '🪒' },
  { key: 'ankleiden', label: 'Ankleiden', icon: '👕' },
  { key: 'auskleiden', label: 'Auskleiden', icon: '🛏️' },
]

export interface KoerperpflegeEintrag {
  id?: string
  user_id?: string
  datum?: string
  uhrzeit?: string
  koerperwaesche?: number
  koerperwaesche_art?: string
  mundpflege?: number
  zahnprothese?: boolean
  zahnprothese_pflege?: number
  haarpflege?: number
  rasur?: number
  nagelpflege?: boolean
  ankleiden?: number
  auskleiden?: number
  hautpflege?: boolean
  hautpflege_mittel?: string
  hautzustand?: string
  druckstellen?: boolean
  druckstellen_lokalisation?: string[]
  inkontinenzversorgung?: boolean
  inkontinenzversorgung_art?: string
  kooperation?: string
  dauer_min?: number
  besonderheiten?: string
  durchgefuehrt_von?: string
  erstellt_am?: string
}

export function adlDurchschnitt(eintrag: KoerperpflegeEintrag): number | null {
  const werte = ADL_FELDER.map(f => (eintrag as Record<string, unknown>)[f.key] as number | undefined).filter(v => v !== undefined && v !== null) as number[]
  if (!werte.length) return null
  return Math.round((werte.reduce((a, b) => a + b, 0) / werte.length) * 10) / 10
}

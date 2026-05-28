// F51: Vitalzeichen-Protokoll & Monitoring

export interface Vitalzeichen {
  id?: string
  user_id?: string
  zeitpunkt: string
  blutdruck_systolisch?: number
  blutdruck_diastolisch?: number
  puls?: number
  puls_rhythmus?: 'regelmaessig' | 'unregelmaessig' | 'bigeminus'
  temperatur?: number
  temperatur_methode?: 'oral' | 'axillar' | 'rektal' | 'tympanal' | 'stirn'
  spo2?: number
  atemfrequenz?: number
  blutzucker?: number
  blutzucker_einheit?: 'mmol/L' | 'mg/dL'
  blutzucker_zeitpunkt?: 'nuechtern' | 'postprandial_1h' | 'postprandial_2h' | 'zufallswert'
  gewicht?: number
  schmerz_nrs?: number
  bewusstsein?: 'klar' | 'verwirrt' | 'somnolent' | 'soporoes' | 'komaeroes'
  lage?: 'liegend' | 'sitzend' | 'stehend'
  messbedingungen?: string
  bemerkungen?: string
  gemessen_von?: string
  erstellt_am?: string
}

export interface VitalzeichenGrenzwert {
  id?: string
  user_id?: string
  parameter: string
  min_wert?: number
  max_wert?: number
  einheit?: string
  aktion_bei_ueberschreitung?: string
  aktiv?: boolean
}

export interface VitalParameter {
  key: keyof Vitalzeichen
  label: string
  einheit: string
  min: number
  max: number
  step: number
  normalMin: number
  normalMax: number
  farbe: string
  icon: string
  formatFn?: (v: number) => string
}

export const VITAL_PARAMETER: VitalParameter[] = [
  {
    key: 'blutdruck_systolisch',
    label: 'Blutdruck systolisch',
    einheit: 'mmHg',
    min: 50, max: 300, step: 1,
    normalMin: 90, normalMax: 140,
    farbe: 'red', icon: '❤️',
  },
  {
    key: 'blutdruck_diastolisch',
    label: 'Blutdruck diastolisch',
    einheit: 'mmHg',
    min: 20, max: 200, step: 1,
    normalMin: 60, normalMax: 90,
    farbe: 'pink', icon: '💗',
  },
  {
    key: 'puls',
    label: 'Puls',
    einheit: 'Schläge/min',
    min: 20, max: 300, step: 1,
    normalMin: 60, normalMax: 100,
    farbe: 'orange', icon: '🫀',
  },
  {
    key: 'temperatur',
    label: 'Temperatur',
    einheit: '°C',
    min: 30, max: 45, step: 0.1,
    normalMin: 36.1, normalMax: 37.2,
    farbe: 'amber', icon: '🌡️',
  },
  {
    key: 'spo2',
    label: 'Sauerstoffsättigung (SpO₂)',
    einheit: '%',
    min: 50, max: 100, step: 1,
    normalMin: 95, normalMax: 100,
    farbe: 'blue', icon: '🫁',
  },
  {
    key: 'atemfrequenz',
    label: 'Atemfrequenz',
    einheit: 'Atemz./min',
    min: 5, max: 60, step: 1,
    normalMin: 12, normalMax: 20,
    farbe: 'cyan', icon: '💨',
  },
  {
    key: 'blutzucker',
    label: 'Blutzucker',
    einheit: 'mmol/L',
    min: 1, max: 50, step: 0.1,
    normalMin: 3.9, normalMax: 6.1,
    farbe: 'purple', icon: '🩸',
  },
  {
    key: 'gewicht',
    label: 'Gewicht',
    einheit: 'kg',
    min: 1, max: 300, step: 0.1,
    normalMin: 0, normalMax: 999,
    farbe: 'teal', icon: '⚖️',
  },
]

export type AmpelStatus = 'normal' | 'grenzwertig' | 'kritisch'

export function pruefGrenzwert(
  wert: number,
  param: VitalParameter,
  grenzwerte?: VitalzeichenGrenzwert
): AmpelStatus {
  const min = grenzwerte?.min_wert ?? param.normalMin
  const max = grenzwerte?.max_wert ?? param.normalMax
  const puffer = (max - min) * 0.1
  if (wert < min - puffer || wert > max + puffer) return 'kritisch'
  if (wert < min || wert > max) return 'grenzwertig'
  return 'normal'
}

export const AMPEL_FARBEN: Record<AmpelStatus, { bg: string; text: string; border: string }> = {
  normal:      { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  grenzwertig: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  kritisch:    { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'   },
}

export const STANDARD_GRENZWERTE: Omit<VitalzeichenGrenzwert, 'id' | 'user_id'>[] = [
  { parameter: 'blutdruck_systolisch',  min_wert: 90,   max_wert: 140,  einheit: 'mmHg',        aktion_bei_ueberschreitung: 'Arzt informieren' },
  { parameter: 'blutdruck_diastolisch', min_wert: 60,   max_wert: 90,   einheit: 'mmHg',        aktion_bei_ueberschreitung: 'Arzt informieren' },
  { parameter: 'puls',                  min_wert: 50,   max_wert: 100,  einheit: 'Schläge/min', aktion_bei_ueberschreitung: 'Arzt informieren' },
  { parameter: 'temperatur',            min_wert: 36.0, max_wert: 38.0, einheit: '°C',           aktion_bei_ueberschreitung: 'Fiebermanagement' },
  { parameter: 'spo2',                  min_wert: 92,   max_wert: 100,  einheit: '%',            aktion_bei_ueberschreitung: 'Sauerstoff prüfen, Arzt' },
  { parameter: 'atemfrequenz',          min_wert: 10,   max_wert: 25,   einheit: 'Atemz./min',  aktion_bei_ueberschreitung: 'Arzt informieren' },
  { parameter: 'blutzucker',            min_wert: 3.9,  max_wert: 8.0,  einheit: 'mmol/L',      aktion_bei_ueberschreitung: 'Arzt/Diabetes-Team' },
]

export function leereVitalzeichen(): Vitalzeichen {
  return {
    zeitpunkt: new Date().toISOString().slice(0, 16),
    puls_rhythmus: 'regelmaessig',
    temperatur_methode: 'tympanal',
    blutzucker_einheit: 'mmol/L',
    blutzucker_zeitpunkt: 'zufallswert',
    bewusstsein: 'klar',
    lage: 'sitzend',
  }
}

export function formatVitalwert(param: VitalParameter, wert: number): string {
  if (param.step === 0.1) return `${wert.toFixed(1)} ${param.einheit}`
  return `${Math.round(wert)} ${param.einheit}`
}

export interface SchlafEintrag {
  id?: string
  user_id?: string
  datum?: string
  schlafbeginn?: string
  schlafende?: string
  schlafdauer_min?: number
  einschlafzeit_min?: number
  aufwachzeiten?: number
  aufwachgruende?: string[]
  schlafqualitaet?: number
  tagschlafdauer_min?: number
  nachtunruhe?: boolean
  nachtunruhe_beschreibung?: string
  albtraeume?: boolean
  schnarchen?: boolean
  atemaussetzer?: boolean
  schmerzen_nacht?: boolean
  toilettengang_nacht?: number
  schlafmittel_gegeben?: boolean
  schlafmittel_name?: string
  einschlafhilfen?: string[]
  lagerung?: string
  gesamtschlaf_ausreichend?: boolean
  massnahmen?: string
  beobachtet_von?: string
  erstellt_am?: string
}

export interface SchlafZiel {
  id?: string
  user_id?: string
  ziel_schlafdauer_h?: number
  ziel_schlafbeginn?: string
  ziel_schlafende?: string
  max_aufwachzeiten?: number
}

export const AUFWACHGRUENDE = [
  'Schmerzen', 'Unruhe / Agitation', 'Toilettengang', 'Lärm', 'Albträume',
  'Hunger / Durst', 'Atemnot', 'Krämpfe', 'Fremdeinwirkung', 'Unbekannt',
]

export const EINSCHLAFHILFEN = [
  'Warme Milch', 'Entspannungsübungen', 'Musik / Hörbuch', 'Lüften',
  'Wärme (Wärmflasche)', 'Massagen', 'Beruhigendes Gespräch', 'Lichttherapie',
]

export const SCHLAFQUALITAET_LABEL: Record<number, { label: string; farbe: string; emoji: string }> = {
  1: { label: 'Sehr schlecht', farbe: 'text-red-600', emoji: '😣' },
  2: { label: 'Schlecht', farbe: 'text-orange-600', emoji: '😞' },
  3: { label: 'Mittel', farbe: 'text-yellow-600', emoji: '😐' },
  4: { label: 'Gut', farbe: 'text-green-500', emoji: '🙂' },
  5: { label: 'Sehr gut', farbe: 'text-green-700', emoji: '😄' },
}

export function formatDauer(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m > 0 ? m + 'min' : ''}`.trim() : `${m}min`
}

export function schlafBewertung(dauer_min: number, ziel_h = 7): { status: 'zu_wenig' | 'ausreichend' | 'zu_viel'; label: string } {
  const h = dauer_min / 60
  if (h < ziel_h - 1) return { status: 'zu_wenig', label: 'Zu wenig Schlaf' }
  if (h > ziel_h + 2) return { status: 'zu_viel', label: 'Zu viel Schlaf' }
  return { status: 'ausreichend', label: 'Ausreichend' }
}

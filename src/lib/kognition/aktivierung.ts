export interface KognitionAssessment {
  id?: string
  user_id?: string
  assessment_datum?: string
  orientierung_zeit?: number
  orientierung_ort?: number
  orientierung_person?: number
  orientierung_situation?: number
  mmse_score?: number
  bpsd_agitation?: boolean
  bpsd_aggression?: boolean
  bpsd_depression?: boolean
  bpsd_angst?: boolean
  bpsd_halluzinationen?: boolean
  bpsd_wahnvorstellungen?: boolean
  bpsd_apathie?: boolean
  bpsd_enthemmung?: boolean
  bpsd_weglauftendenz?: boolean
  bpsd_beschreibung?: string
  kommunikation?: string
  verstaendnis?: string
  stimmung?: string
  tagesform?: string
  bemerkungen?: string
  beurteilt_von?: string
  erstellt_am?: string
}

export interface AktivierungsEintrag {
  id?: string
  user_id?: string
  datum?: string
  uhrzeit?: string
  aktivitaet: string
  kategorie?: string
  dauer_min?: number
  teilnahme?: string
  reaktion?: string
  besonderheiten?: string
  durchgefuehrt_von?: string
}

export const AKTIVITAET_KATEGORIEN = [
  { key: 'Kognitiv', icon: '🧠', farbe: 'bg-purple-100 text-purple-700' },
  { key: 'Motorisch', icon: '🤸', farbe: 'bg-blue-100 text-blue-700' },
  { key: 'Sozial', icon: '👥', farbe: 'bg-green-100 text-green-700' },
  { key: 'Kreativ', icon: '🎨', farbe: 'bg-pink-100 text-pink-700' },
  { key: 'Alltagsnah', icon: '🏠', farbe: 'bg-yellow-100 text-yellow-700' },
  { key: 'Musik', icon: '🎵', farbe: 'bg-indigo-100 text-indigo-700' },
  { key: 'Natur', icon: '🌿', farbe: 'bg-emerald-100 text-emerald-700' },
  { key: 'Erinnern', icon: '📷', farbe: 'bg-orange-100 text-orange-700' },
]

export const AKTIVITAET_VORSCHLAEGE: Record<string, string[]> = {
  Kognitiv: ['Kreuzworträtsel', 'Memory spielen', 'Zeitungen lesen', 'Rechenaufgaben', 'Buchstabensalat', 'Bilder beschreiben'],
  Motorisch: ['Sitztanz', 'Ballspiele', 'Fingergymnastik', 'Spaziergang', 'Gleichgewichtsübungen'],
  Sozial: ['Besuch empfangen', 'Telefonieren', 'Gruppenaktivität', 'Erzählrunde'],
  Kreativ: ['Malen', 'Basteln', 'Stricken', 'Blumen arrangieren', 'Collagen erstellen'],
  Alltagsnah: ['Tisch decken', 'Falten', 'Sortieren', 'Kochen/Backen', 'Pflanzen gießen'],
  Musik: ['Lieblingsmusik hören', 'Singen', 'Rhythmusspiele', 'Konzert besuchen'],
  Natur: ['Gartenarbeit', 'Vögel beobachten', 'Spaziergang im Freien', 'Blumen pflanzen'],
  Erinnern: ['Fotoalbum anschauen', 'Lebensgeschichte erzählen', 'Alte Filme anschauen', 'Musik aus Jugendzeit'],
}

export const STIMMUNG_OPTIONEN = ['Ausgeglichen', 'Freudig', 'Traurig', 'Ängstlich', 'Agitiert', 'Apathisch', 'Gereizt']
export const KOMMUNIKATION_OPTIONEN = ['Verbal gut', 'Verbal eingeschränkt', 'Non-verbal', 'Keine Kommunikation']
export const VERSTAENDNIS_OPTIONEN = ['Vollständig', 'Teilweise', 'Minimal', 'Nicht einschätzbar']
export const TEILNAHME_OPTIONEN = ['Aktiv', 'Passiv', 'Abgelehnt']
export const REAKTION_OPTIONEN = ['Freudig', 'Positiv', 'Neutral', 'Ablehnend', 'Agitiert']

export const BPSD_ITEMS: { key: string; label: string }[] = [
  { key: 'bpsd_agitation', label: 'Agitation / Unruhe' },
  { key: 'bpsd_aggression', label: 'Aggression' },
  { key: 'bpsd_depression', label: 'Depressive Stimmung' },
  { key: 'bpsd_angst', label: 'Angst / Panik' },
  { key: 'bpsd_halluzinationen', label: 'Halluzinationen' },
  { key: 'bpsd_wahnvorstellungen', label: 'Wahnvorstellungen' },
  { key: 'bpsd_apathie', label: 'Apathie / Antriebslosigkeit' },
  { key: 'bpsd_enthemmung', label: 'Enthemmung' },
  { key: 'bpsd_weglauftendenz', label: 'Weglauftendenz' },
]

export function mmseEinstufung(score: number): { label: string; farbe: string } {
  if (score >= 27) return { label: 'Normal', farbe: 'text-green-600' }
  if (score >= 21) return { label: 'Leichte Demenz', farbe: 'text-yellow-600' }
  if (score >= 10) return { label: 'Mittelschwere Demenz', farbe: 'text-orange-600' }
  return { label: 'Schwere Demenz', farbe: 'text-red-600' }
}

export function orientierungsScore(assessment: KognitionAssessment): number {
  const felder = ['orientierung_zeit', 'orientierung_ort', 'orientierung_person', 'orientierung_situation']
  return felder.reduce((sum, f) => sum + ((assessment as Record<string, unknown>)[f] as number | undefined ?? 0), 0)
}

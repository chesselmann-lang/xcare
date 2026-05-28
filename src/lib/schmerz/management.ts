// F50: Schmerzmanagement-Protokoll

export interface SchmerzEintrag {
  id?: string
  user_id?: string
  zeitpunkt: string
  nrs_wert?: number
  besd_atmung?: number
  besd_lautaeusserungen?: number
  besd_gesichtsausdruck?: number
  besd_koerpersprache?: number
  besd_trost?: number
  besd_gesamt?: number
  charakter?: string[]
  lokalisation?: string[]
  ausstrahlung?: string
  dauer?: 'kurz' | 'intermittierend' | 'dauernd' | 'wechselnd'
  ausloeser?: string[]
  lindernd?: string[]
  medikament_gegeben?: boolean
  medikament_name?: string
  medikament_dosis?: string
  wirkung_nach_30min?: number
  uebelkeit?: boolean
  schlafst?: number
  massnahmen?: string
  bemerkungen?: string
  erstellt_von?: string
  erstellt_am?: string
}

export interface SchmerzTherapieplan {
  id?: string
  user_id?: string
  bezeichnung: string
  schmerzart?: string
  medikamente?: Array<{ name: string; dosis: string; zeitpunkt: string }>
  nicht_medikamentoes?: string[]
  ziel_nrs?: number
  aktiv?: boolean
  erstellt_am?: string
}

export const SCHMERZ_CHARAKTER = [
  { key: 'brennend',    label: 'Brennend',    emoji: '🔥' },
  { key: 'stechend',   label: 'Stechend',    emoji: '📍' },
  { key: 'dumpf',      label: 'Dumpf',       emoji: '🪨' },
  { key: 'drueckend',  label: 'Drückend',    emoji: '⬇️' },
  { key: 'pulsierend', label: 'Pulsierend',  emoji: '💓' },
  { key: 'krampfartig',label: 'Krampfartig', emoji: '⚡' },
  { key: 'ziehend',    label: 'Ziehend',     emoji: '🪝' },
  { key: 'einschies',  label: 'Einschießend',emoji: '⚡' },
]

export const SCHMERZ_LOKALISATION = [
  'Kopf', 'Gesicht', 'Hals/Nacken', 'Schulter links', 'Schulter rechts',
  'Arm links', 'Arm rechts', 'Brust (Thorax)', 'Bauch/Abdomen',
  'Rücken oben', 'Rücken unten/LWS', 'Hüfte links', 'Hüfte rechts',
  'Bein links', 'Bein rechts', 'Knie links', 'Knie rechts',
  'Fuß links', 'Fuß rechts', 'Ganzkörper',
]

export const SCHMERZ_AUSLOESER = [
  'Bewegung', 'Lageänderung', 'Druck', 'Berührung', 'Essen',
  'Schlucken', 'Husten', 'Tiefes Einatmen', 'Belastung', 'Ruhe/Nacht',
  'Kälte', 'Wärme', 'Stress', 'Unbekannt',
]

export const LINDERND_MASSNAHMEN = [
  'Wärme', 'Kälte', 'Lagerung', 'Ruhe', 'Ablenkung',
  'Massage', 'Schmerzmittel', 'Bewegung', 'Atemübungen',
]

export const BESD_ITEMS: Record<string, { label: string; stufen: Record<number, string> }> = {
  besd_atmung: {
    label: 'Atmung',
    stufen: { 0: 'Normal', 1: 'Gelegentlich angestrengt', 2: 'Lautstark / erschwert' }
  },
  besd_lautaeusserungen: {
    label: 'Lautäußerungen',
    stufen: { 0: 'Keine', 1: 'Gelegentliches Stöhnen', 2: 'Lautes Stöhnen/Schreien' }
  },
  besd_gesichtsausdruck: {
    label: 'Gesichtsausdruck',
    stufen: { 0: 'Entspannt', 1: 'Traurig/Ängstlich', 2: 'Grimassieren' }
  },
  besd_koerpersprache: {
    label: 'Körpersprache',
    stufen: { 0: 'Entspannt', 1: 'Angespannt', 2: 'Starr/Geballt' }
  },
  besd_trost: {
    label: 'Tröstbarkeit',
    stufen: { 0: 'Nicht nötig/Tröstbar', 1: 'Ablenkbar', 2: 'Untröstlich' }
  },
}

export function nrsBewertung(nrs: number): { label: string; farbe: string; empfehlung: string } {
  if (nrs === 0) return { label: 'Kein Schmerz',   farbe: 'green',  empfehlung: 'Keine Maßnahmen notwendig' }
  if (nrs <= 3)  return { label: 'Leicht',          farbe: 'lime',   empfehlung: 'Nicht-medikamentöse Maßnahmen (Wärme, Lagerung)' }
  if (nrs <= 6)  return { label: 'Mäßig',           farbe: 'amber',  empfehlung: 'WHO-Stufe I Analgetika prüfen, Pflegemaßnahmen' }
  if (nrs <= 9)  return { label: 'Stark',            farbe: 'orange', empfehlung: 'Arzt informieren, WHO-Stufe II/III erwägen' }
  return           { label: 'Unerträglich',          farbe: 'red',    empfehlung: 'Sofort ärztliche Hilfe, Notfallmedikation' }
}

export function besdBewertung(gesamt: number): { label: string; farbe: string } {
  if (gesamt <= 1) return { label: 'Kein/kaum Schmerz', farbe: 'green' }
  if (gesamt <= 4) return { label: 'Leichter Schmerz',  farbe: 'lime'  }
  if (gesamt <= 6) return { label: 'Mäßiger Schmerz',   farbe: 'amber' }
  return            { label: 'Starker Schmerz',          farbe: 'red'   }
}

export function leererSchmerzEintrag(): SchmerzEintrag {
  return {
    zeitpunkt: new Date().toISOString().slice(0, 16),
    nrs_wert: 0,
    charakter: [],
    lokalisation: [],
    ausloeser: [],
    lindernd: [],
    dauer: 'kurz',
    medikament_gegeben: false,
    uebelkeit: false,
    schlafst: 0,
  }
}

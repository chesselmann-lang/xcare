export type PVTyp = 'patientenverfuegung' | 'vorsorgevollmacht' | 'betreuungsverfuegung'

export interface PatientenverfuegungInhalt {
  // Personal info
  vollstaendiger_name: string
  geburtsdatum: string
  geburtsort: string
  adresse: string

  // Medical situations covered
  situationen: {
    irreversible_bewusstlosigkeit: boolean
    schwere_hirnschaedigung: boolean
    endstadium_erkrankung: boolean
    demenz_endstadium: boolean
    nach_reanimation_schwer_geschaedigt: boolean
  }

  // Treatment wishes
  behandlungswuensche: {
    intensivmedizin: 'ja' | 'nein' | 'situationsabhaengig'
    kuenstliche_beatmung: 'ja' | 'nein' | 'befristet'
    kuenstliche_ernaehrung: 'ja' | 'nein' | 'befristet'
    dialyse: 'ja' | 'nein' | 'befristet'
    wiederbelebung: 'ja' | 'nein'
    schmerztherapie: 'palliativ' | 'maximal'
    hospiz: boolean
    organspende: 'ja' | 'nein' | 'bereits_geregelt'
  }

  // Preferences
  wuensche: {
    sterbensort: 'zuhause' | 'hospiz' | 'krankenhaus' | 'pflegeheim'
    religioes_weltanschaulich: string
    persoenliche_erklaerung: string
  }

  // Signature
  ort_datum: string
  unterschrift_bestaetigt: boolean
  zeugen: Array<{ name: string; adresse: string }>
}

export interface VorsorgevollmachtInhalt {
  vollmachtgeber: { name: string; geburtsdatum: string; adresse: string }
  bevollmaechtigte: Array<{
    name: string
    beziehung: string
    adresse: string
    gemeinschaftlich: boolean
  }>
  befugnisse: {
    gesundheitssorge: boolean
    aufenthaltsbestimmung: boolean
    vermoegensverwaltung: boolean
    immobilien: boolean
    bankgeschaefte: boolean
    post_telekommunikation: boolean
    behoerden: boolean
    gerichtlich: boolean
  }
  untervollmacht: boolean
  befreiung_selbstkontrahierung: boolean
  ort_datum: string
  unterschrift_bestaetigt: boolean
}

export interface BetreuungsverfuegungInhalt {
  vollstaendiger_name: string
  geburtsdatum: string
  adresse: string
  gewuenschte_betreuer: Array<{ name: string; beziehung: string; adresse: string; telefon: string }>
  abgelehnte_betreuer: string
  wuensche_zur_betreuung: string
  aufenthaltsort: 'zuhause' | 'pflegeheim' | 'betreutes_wohnen' | 'keine_angabe'
  besondere_wuensche: string
  ort_datum: string
  unterschrift_bestaetigt: boolean
}

// Step definitions for wizard
export const PV_SCHRITTE = [
  { id: 'persoenliche_daten', titel: 'Persönliche Daten', beschreibung: 'Ihre Angaben zur Person' },
  { id: 'situationen', titel: 'Medizinische Situationen', beschreibung: 'Wann soll die Verfügung gelten?' },
  { id: 'behandlung', titel: 'Behandlungswünsche', beschreibung: 'Ihre Wünsche zur medizinischen Behandlung' },
  { id: 'weitere_wuensche', titel: 'Weitere Wünsche', beschreibung: 'Persönliche und religiöse Wünsche' },
  { id: 'unterschrift', titel: 'Abschluss', beschreibung: 'Bestätigung und Download' },
] as const

export const VV_SCHRITTE = [
  { id: 'vollmachtgeber', titel: 'Vollmachtgeber', beschreibung: 'Ihre persönlichen Daten' },
  { id: 'bevollmaechtigte', titel: 'Bevollmächtigte Personen', beschreibung: 'Wen bevollmächtigen Sie?' },
  { id: 'befugnisse', titel: 'Befugnisse', beschreibung: 'Welche Entscheidungen darf die Person treffen?' },
  { id: 'abschluss', titel: 'Abschluss', beschreibung: 'Bestätigung und Download' },
] as const

export const BV_SCHRITTE = [
  { id: 'persoenliche_daten', titel: 'Persönliche Daten', beschreibung: 'Ihre Angaben zur Person' },
  { id: 'betreuer', titel: 'Gewünschte Betreuer', beschreibung: 'Wen wünschen Sie als Betreuer?' },
  { id: 'wuensche', titel: 'Betreuungswünsche', beschreibung: 'Ihre Wünsche zur Betreuung' },
  { id: 'abschluss', titel: 'Abschluss', beschreibung: 'Bestätigung und Download' },
] as const

export type PVSchritt = typeof PV_SCHRITTE[number]['id']
export type VVSchritt = typeof VV_SCHRITTE[number]['id']
export type BVSchritt = typeof BV_SCHRITTE[number]['id']

export const TYP_LABELS: Record<PVTyp, string> = {
  patientenverfuegung: 'Patientenverfügung',
  vorsorgevollmacht: 'Vorsorgevollmacht',
  betreuungsverfuegung: 'Betreuungsverfügung',
}

export const STATUS_LABELS = {
  entwurf: 'Entwurf',
  fertig: 'Fertig',
  widerrufen: 'Widerrufen',
} as const

export function defaultPVInhalt(): PatientenverfuegungInhalt {
  return {
    vollstaendiger_name: '',
    geburtsdatum: '',
    geburtsort: '',
    adresse: '',
    situationen: {
      irreversible_bewusstlosigkeit: false,
      schwere_hirnschaedigung: false,
      endstadium_erkrankung: false,
      demenz_endstadium: false,
      nach_reanimation_schwer_geschaedigt: false,
    },
    behandlungswuensche: {
      intensivmedizin: 'situationsabhaengig',
      kuenstliche_beatmung: 'nein',
      kuenstliche_ernaehrung: 'nein',
      dialyse: 'nein',
      wiederbelebung: 'nein',
      schmerztherapie: 'palliativ',
      hospiz: true,
      organspende: 'nein',
    },
    wuensche: {
      sterbensort: 'zuhause',
      religioes_weltanschaulich: '',
      persoenliche_erklaerung: '',
    },
    ort_datum: '',
    unterschrift_bestaetigt: false,
    zeugen: [],
  }
}

export function defaultVVInhalt(): VorsorgevollmachtInhalt {
  return {
    vollmachtgeber: { name: '', geburtsdatum: '', adresse: '' },
    bevollmaechtigte: [],
    befugnisse: {
      gesundheitssorge: true,
      aufenthaltsbestimmung: true,
      vermoegensverwaltung: false,
      immobilien: false,
      bankgeschaefte: false,
      post_telekommunikation: false,
      behoerden: true,
      gerichtlich: false,
    },
    untervollmacht: false,
    befreiung_selbstkontrahierung: false,
    ort_datum: '',
    unterschrift_bestaetigt: false,
  }
}

export function defaultBVInhalt(): BetreuungsverfuegungInhalt {
  return {
    vollstaendiger_name: '',
    geburtsdatum: '',
    adresse: '',
    gewuenschte_betreuer: [],
    abgelehnte_betreuer: '',
    wuensche_zur_betreuung: '',
    aufenthaltsort: 'keine_angabe',
    besondere_wuensche: '',
    ort_datum: '',
    unterschrift_bestaetigt: false,
  }
}

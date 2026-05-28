// lib/notfall/karte.ts — Notfallplan Datenstruktur & Hilfsfunktionen

export interface NotfallMedikament {
  name: string;
  dosis: string;
  einheit: string;
  frequenz: string;
  hinweis?: string;
}

export interface NotfallplanData {
  id?: string;
  user_id?: string;
  vollstaendiger_name?: string;
  geburtsdatum?: string;
  blutgruppe?: string;
  hauptdiagnosen: string[];
  allergien: string[];
  unvertraeglichkeiten: string[];
  implantate: string[];
  notfall_medikamente: NotfallMedikament[];
  reanimation_gewuenscht?: boolean | null;
  patientenverfuegung_vorh: boolean;
  patientenverfuegung_ort?: string;
  vorsorgevollmacht_vorh: boolean;
  bevollmaechtigte_name?: string;
  bevollmaechtigte_telefon?: string;
  kontakt_1_name?: string;
  kontakt_1_telefon?: string;
  kontakt_1_relation?: string;
  kontakt_2_name?: string;
  kontakt_2_telefon?: string;
  kontakt_2_relation?: string;
  hausarzt_name?: string;
  hausarzt_telefon?: string;
  hausarzt_praxis?: string;
  krankenkasse?: string;
  versicherungsnummer?: string;
  karte_erstellt_am?: string;
  erstellt_am?: string;
  aktualisiert_am?: string;
}

export const BLUTGRUPPEN = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-', 'unbekannt'] as const;

export const REANIMATION_OPTIONEN = [
  { value: true, label: 'Ja – Reanimation erwünscht', farbe: 'green' },
  { value: false, label: 'Nein – Keine Reanimation (DNR)', farbe: 'red' },
  { value: null, label: 'Nicht festgelegt', farbe: 'gray' },
] as const;

export function berechneVollstaendigkeit(plan: NotfallplanData): number {
  const felder = [
    plan.vollstaendiger_name,
    plan.geburtsdatum,
    plan.blutgruppe,
    plan.hauptdiagnosen.length > 0,
    plan.kontakt_1_name && plan.kontakt_1_telefon,
    plan.hausarzt_name,
    plan.krankenkasse,
    plan.reanimation_gewuenscht !== undefined,
  ];
  const gefuellt = felder.filter(Boolean).length;
  return Math.round((gefuellt / felder.length) * 100);
}

export function formatiertesDatum(iso?: string): string {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function leerePlan(): NotfallplanData {
  return {
    vollstaendiger_name: '',
    geburtsdatum: '',
    blutgruppe: 'unbekannt',
    hauptdiagnosen: [],
    allergien: [],
    unvertraeglichkeiten: [],
    implantate: [],
    notfall_medikamente: [],
    reanimation_gewuenscht: null,
    patientenverfuegung_vorh: false,
    patientenverfuegung_ort: '',
    vorsorgevollmacht_vorh: false,
    bevollmaechtigte_name: '',
    bevollmaechtigte_telefon: '',
    kontakt_1_name: '',
    kontakt_1_telefon: '',
    kontakt_1_relation: '',
    kontakt_2_name: '',
    kontakt_2_telefon: '',
    kontakt_2_relation: '',
    hausarzt_name: '',
    hausarzt_telefon: '',
    hausarzt_praxis: '',
    krankenkasse: '',
    versicherungsnummer: '',
  };
}

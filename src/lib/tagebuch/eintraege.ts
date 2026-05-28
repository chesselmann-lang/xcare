// lib/tagebuch/eintraege.ts

export interface TagebuchEintrag {
  id?: string;
  user_id?: string;
  eintrag_datum: string;
  stimmung?: number | null;
  schmerz_level?: number | null;
  blutdruck_sys?: number | null;
  blutdruck_dia?: number | null;
  puls?: number | null;
  temperatur?: number | null;
  blutzucker?: number | null;
  gewicht?: number | null;
  sauerstoff?: number | null;
  aktivitaeten: string[];
  pflegeleistungen: string[];
  notizen?: string;
  besonderheiten?: string;
  sturz_ereignis: boolean;
  sturz_beschr?: string;
  medikamente_ok?: boolean | null;
  medikamente_notiz?: string;
  trinkmenge_ml?: number | null;
  mahlzeiten?: number | null;
  schlaf_stunden?: number | null;
  schlaf_qualitaet?: number | null;
  erstellt_am?: string;
}

export const STIMMUNGS_EMOJIS = ['😢', '😕', '😐', '🙂', '😄'];
export const STIMMUNGS_LABELS = ['Sehr schlecht', 'Schlecht', 'Mittel', 'Gut', 'Sehr gut'];

export const AKTIVITAETEN_VORSCHLAEGE = [
  'Spaziergang', 'Gymnastik', 'Lesen', 'Fernsehen', 'Gespräch', 
  'Musik hören', 'Basteln', 'Gartenarbeit', 'Physiotherapie', 'Ergotherapie',
];

export const PFLEGELEISTUNGEN_VORSCHLAEGE = [
  'Körperpflege', 'Ankleiden', 'Mundpflege', 'Lagerung', 'Mobilisation',
  'Verbandwechsel', 'Kompressionsstrümpfe', 'Augenauftropfen', 'Injektionen',
];

export function leererEintrag(): TagebuchEintrag {
  return {
    eintrag_datum: new Date().toISOString().split('T')[0],
    stimmung: null,
    schmerz_level: null,
    blutdruck_sys: null,
    blutdruck_dia: null,
    puls: null,
    temperatur: null,
    blutzucker: null,
    gewicht: null,
    sauerstoff: null,
    aktivitaeten: [],
    pflegeleistungen: [],
    notizen: '',
    besonderheiten: '',
    sturz_ereignis: false,
    sturz_beschr: '',
    medikamente_ok: null,
    medikamente_notiz: '',
    trinkmenge_ml: null,
    mahlzeiten: null,
    schlaf_stunden: null,
    schlaf_qualitaet: null,
  };
}

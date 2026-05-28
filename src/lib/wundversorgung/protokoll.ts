// lib/wundversorgung/protokoll.ts

export interface Wunde {
  id?: string;
  user_id?: string;
  bezeichnung: string;
  lokalisation: string;
  wundart: string;
  ersterfassung_datum: string;
  status: string;
  groesse_cm2?: number;
  tiefe_mm?: number;
  wundgrund?: string;
  wundrand?: string;
  exsudat_menge?: string;
  exsudat_art?: string;
  infektion_zeichen: boolean;
  schmerz_nrs?: number;
  wundauflage?: string;
  wechselintervall_tage: number;
  behandelnder_arzt?: string;
  pflegeperson?: string;
  notizen?: string;
  naechster_wechsel?: string;
  erstellt_am?: string;
  aktualisiert_am?: string;
}

export interface Verbandswechsel {
  id?: string;
  wunde_id: string;
  user_id?: string;
  wechsel_datum: string;
  wechsel_zeit?: string;
  groesse_cm2?: number;
  tiefe_mm?: number;
  exsudat_menge?: string;
  exsudat_art?: string;
  wundgrund?: string;
  infektion_zeichen: boolean;
  schmerz_nrs?: number;
  wundauflage_entfernt?: string;
  wundauflage_neu?: string;
  reinigung?: string;
  heilungsfortschritt?: string;
  durchgefuehrt_von?: string;
  arzt_informiert: boolean;
  notizen?: string;
  foto_url?: string;
  erstellt_am?: string;
}

export const WUNDARTEN = [
  { value: 'dekubitus', label: 'Dekubitus', icon: '🛏️' },
  { value: 'ulcus_cruris', label: 'Ulcus cruris (Beingeschwür)', icon: '🦵' },
  { value: 'diabetisches_fussulcus', label: 'Diabetisches Fußulcus', icon: '🦶' },
  { value: 'traumatisch', label: 'Traumatisch', icon: '⚡' },
  { value: 'postoperativ', label: 'Postoperativ', icon: '🏥' },
  { value: 'sonstige', label: 'Sonstige', icon: '📝' },
] as const;

export const WUND_STATUS = [
  { value: 'aktiv', label: 'Aktiv', farbe: 'red' },
  { value: 'heilend', label: 'Heilend', farbe: 'yellow' },
  { value: 'chronisch', label: 'Chronisch', farbe: 'orange' },
  { value: 'geheilt', label: 'Geheilt', farbe: 'green' },
] as const;

export const EXSUDAT_MENGEN = ['kein', 'wenig', 'mittel', 'stark'] as const;

export const HEILUNGSFORTSCHRITT = [
  { value: 'verbessert', label: 'Verbessert ↑', farbe: 'green' },
  { value: 'unveraendert', label: 'Unverändert →', farbe: 'yellow' },
  { value: 'verschlechtert', label: 'Verschlechtert ↓', farbe: 'red' },
] as const;

export const LOKALISATION_VORSCHLAEGE = [
  'Ferse rechts', 'Ferse links', 'Steißbein/Sakrum', 'Trochanter rechts', 'Trochanter links',
  'Knöchel rechts', 'Knöchel links', 'Unterschenkel rechts', 'Unterschenkel links',
  'Unterschenkel beidseits', 'Fußrücken', 'Zehen', 'Schulterblatt', 'Hinterhaupt',
] as const;

export const WUNDAUFLAGE_VORSCHLAEGE = [
  'Hydrokolloid-Verband', 'Schaumverband', 'Alginate', 'Hydrogel', 'Silberhaltige Auflage',
  'VAC-Verband', 'Fettgaze', 'Wundgaze steril', 'PHMB-Auflage', 'Kompresse + Fixierpflaster',
] as const;

export function berechneNaechsterWechsel(datum: string, intervallTage: number): string {
  const d = new Date(datum);
  d.setDate(d.getDate() + intervallTage);
  return d.toISOString().split('T')[0];
}

export function wechselFaellig(naechsterWechsel?: string): boolean {
  if (!naechsterWechsel) return false;
  return new Date(naechsterWechsel) <= new Date();
}

export function leereWunde(): Wunde {
  return {
    bezeichnung: '',
    lokalisation: '',
    wundart: 'dekubitus',
    ersterfassung_datum: new Date().toISOString().split('T')[0],
    status: 'aktiv',
    infektion_zeichen: false,
    wechselintervall_tage: 2,
    naechster_wechsel: berechneNaechsterWechsel(new Date().toISOString().split('T')[0], 2),
  };
}

export function leererVerbandswechsel(wundeId: string): Verbandswechsel {
  return {
    wunde_id: wundeId,
    wechsel_datum: new Date().toISOString().split('T')[0],
    wechsel_zeit: new Date().toTimeString().slice(0, 5),
    infektion_zeichen: false,
    arzt_informiert: false,
  };
}

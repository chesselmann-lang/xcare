// lib/medikamente/manager.ts

export interface UserMedikament {
  id?: string;
  user_id?: string;
  name: string;
  wirkstoff?: string;
  darreichungsform?: string;
  staerke?: string;
  einheit: string;
  dosis_morgen: number;
  dosis_mittag: number;
  dosis_abend: number;
  dosis_nacht: number;
  dosis_bedarf: boolean;
  beginn_datum?: string;
  ende_datum?: string;
  dauerhaft: boolean;
  vorrat_stueck: number;
  nachbestellung_ab: number;
  indikation?: string;
  einnahmehinweis?: string;
  verschreibend_arzt?: string;
  aktiv: boolean;
  erstellt_am?: string;
  aktualisiert_am?: string;
}

export interface MedEinnahme {
  id?: string;
  medikament_id: string;
  einnahme_datum: string;
  tageszeit: 'morgen' | 'mittag' | 'abend' | 'nacht' | 'bedarf';
  genommen: boolean;
  notiz?: string;
}

export const TAGESZEITEN = [
  { key: 'morgen', label: 'Morgens', emoji: '🌅', zeit: '08:00' },
  { key: 'mittag', label: 'Mittags', emoji: '☀️', zeit: '12:00' },
  { key: 'abend', label: 'Abends', emoji: '🌆', zeit: '18:00' },
  { key: 'nacht', label: 'Nachts', emoji: '🌙', zeit: '22:00' },
] as const;

export const DARREICHUNGSFORMEN = [
  { v: 'tablette', l: '💊 Tablette' }, { v: 'kapsel', l: '💊 Kapsel' },
  { v: 'tropfen', l: '💧 Tropfen' }, { v: 'injektion', l: '💉 Injektion' },
  { v: 'pflaster', l: '🩹 Pflaster' }, { v: 'salbe', l: '🧴 Salbe' },
  { v: 'spray', l: '💨 Spray' }, { v: 'infusion', l: '🩸 Infusion' },
  { v: 'sonstiges', l: '📦 Sonstiges' },
];

export function leeresMediakment(): UserMedikament {
  return {
    name: '', einheit: 'mg', dosis_morgen: 0, dosis_mittag: 0, dosis_abend: 0, dosis_nacht: 0,
    dosis_bedarf: false, dauerhaft: true, vorrat_stueck: 0, nachbestellung_ab: 7, aktiv: true,
  };
}

export function berechneTagesportionen(med: UserMedikament): number {
  return med.dosis_morgen + med.dosis_mittag + med.dosis_abend + med.dosis_nacht;
}

export function vorratReicht(med: UserMedikament): number {
  const tagesportionen = berechneTagesportionen(med);
  if (tagesportionen <= 0) return 999;
  return Math.floor(med.vorrat_stueck / tagesportionen);
}

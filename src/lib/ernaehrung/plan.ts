// lib/ernaehrung/plan.ts — Ernährungsplan & Flüssigkeitsbilanz

export interface Ernaehrungsprofil {
  id?: string;
  user_id?: string;
  // MNA-Screening
  mna_gewichtsverlust: 0 | 1 | 2 | 3;
  mna_mobilitaet: 0 | 1 | 2;
  mna_stress: 0 | 2;
  mna_neuropsych: 0 | 1 | 2;
  mna_bmi: 0 | 1 | 2 | 3;
  // Kostform
  kostform: string;
  dysphagie_level: number;
  // Unverträglichkeiten
  nahrungsmittelallergien: string[];
  unvertraeglichkeiten: string[];
  // Zielwerte
  flüssigkeitsbedarf_ml: number;
  kalorienziel_kcal?: number;
  proteinziel_g?: number;
  besonderheiten?: string;
  ernaehrungsberater?: string;
  letztes_mna_datum?: string;
  erstellt_am?: string;
  aktualisiert_am?: string;
}

export interface Fluessigkeitsbilanz {
  id?: string;
  user_id?: string;
  bilanz_datum: string;
  trinkmenge_ml: number;
  nahrung_ml: number;
  infusion_ml: number;
  urin_ml: number;
  sonstiges_ml: number;
  bilanz_ml?: number; // GENERATED
  einzel_getraenke: GetraenkEintrag[];
  notizen?: string;
  erstellt_am?: string;
  aktualisiert_am?: string;
}

export interface GetraenkEintrag {
  zeit: string;
  art: string;
  menge_ml: number;
}

export interface MahlzeitProtokoll {
  id?: string;
  user_id?: string;
  mahlzeit_datum: string;
  tageszeit: string;
  portion: string;
  kcal_schaetzung?: number;
  nahrungsmittel?: string;
  notizen?: string;
  erstellt_am?: string;
}

export const KOSTFORMEN = [
  { value: 'normal', label: 'Normal', icon: '🍽️' },
  { value: 'leicht_verdaulich', label: 'Leicht verdaulich', icon: '🥣' },
  { value: 'passiert', label: 'Passiert', icon: '🥄' },
  { value: 'fluessig', label: 'Flüssig', icon: '🥤' },
  { value: 'hochkalorisch', label: 'Hochkalorisch', icon: '💪' },
  { value: 'diabetisch', label: 'Diabetisch', icon: '🩺' },
  { value: 'vegetarisch', label: 'Vegetarisch', icon: '🥗' },
  { value: 'vegan', label: 'Vegan', icon: '🌱' },
  { value: 'sonstiges', label: 'Sonstiges', icon: '📝' },
] as const;

export const IDDSI_LEVEL = [
  { level: 0, name: 'Fließend', farbe: 'blue' },
  { level: 1, name: 'Dünnflüssig', farbe: 'blue' },
  { level: 2, name: 'Leicht dickflüssig', farbe: 'cyan' },
  { level: 3, name: 'Mäßig dickflüssig', farbe: 'teal' },
  { level: 4, name: 'Extrem dickflüssig / Püriert', farbe: 'yellow' },
  { level: 5, name: 'Gewürfelt & weich', farbe: 'orange' },
  { level: 6, name: 'Weich & mundgerecht', farbe: 'red' },
  { level: 7, name: 'Normal', farbe: 'green' },
] as const;

export const TAGESZEITEN_MAHLZEIT = [
  { value: 'fruehstueck', label: 'Frühstück', icon: '🌅', kcal: 400 },
  { value: 'zwischenmahlzeit_vm', label: 'Zwischenmahlzeit (VM)', icon: '🍎', kcal: 150 },
  { value: 'mittagessen', label: 'Mittagessen', icon: '☀️', kcal: 600 },
  { value: 'zwischenmahlzeit_nm', label: 'Zwischenmahlzeit (NM)', icon: '🍌', kcal: 150 },
  { value: 'abendessen', label: 'Abendessen', icon: '🌙', kcal: 450 },
  { value: 'spaetmahlzeit', label: 'Spätmahlzeit', icon: '🌃', kcal: 200 },
] as const;

export const PORTIONEN = [
  { value: 'ganz', label: 'Ganz (100%)', prozent: 100 },
  { value: 'dreiviertel', label: '¾ (75%)', prozent: 75 },
  { value: 'halb', label: 'Halb (50%)', prozent: 50 },
  { value: 'viertel', label: '¼ (25%)', prozent: 25 },
  { value: 'gar_nicht', label: 'Nichts (0%)', prozent: 0 },
] as const;

export const MNA_ITEMS = [
  {
    key: 'mna_gewichtsverlust',
    frage: 'Gewichtsverlust in den letzten 3 Monaten',
    optionen: [
      { wert: 3, label: 'Kein Gewichtsverlust' },
      { wert: 2, label: 'Unbekannt' },
      { wert: 1, label: '1–3 kg' },
      { wert: 0, label: '>3 kg' },
    ],
  },
  {
    key: 'mna_mobilitaet',
    frage: 'Mobilität',
    optionen: [
      { wert: 2, label: 'Normal (geht aus dem Haus)' },
      { wert: 1, label: 'Selbstständig drinnen' },
      { wert: 0, label: 'Bettlägerig / Rollstuhl' },
    ],
  },
  {
    key: 'mna_stress',
    frage: 'Akute Erkrankung / Stress in den letzten 3 Monaten',
    optionen: [
      { wert: 2, label: 'Nein' },
      { wert: 0, label: 'Ja' },
    ],
  },
  {
    key: 'mna_neuropsych',
    frage: 'Neuropsychologische Probleme',
    optionen: [
      { wert: 2, label: 'Keine' },
      { wert: 1, label: 'Leichte Demenz / Depression' },
      { wert: 0, label: 'Schwere Demenz / Depression' },
    ],
  },
  {
    key: 'mna_bmi',
    frage: 'Body Mass Index (BMI)',
    optionen: [
      { wert: 3, label: 'BMI ≥ 23' },
      { wert: 2, label: 'BMI 21–23' },
      { wert: 1, label: 'BMI 19–21' },
      { wert: 0, label: 'BMI < 19' },
    ],
  },
] as const;

export function berechneMnaScore(profil: Ernaehrungsprofil): number {
  return profil.mna_gewichtsverlust + profil.mna_mobilitaet + profil.mna_stress +
    profil.mna_neuropsych + profil.mna_bmi;
}

export function mnaRisiko(score: number): { stufe: string; farbe: string; beschr: string } {
  if (score >= 12) return { stufe: 'Normal', farbe: 'green', beschr: 'Kein Mangelernährungsrisiko' };
  if (score >= 8) return { stufe: 'Risiko', farbe: 'yellow', beschr: 'Risiko für Mangelernährung' };
  return { stufe: 'Mangel', farbe: 'red', beschr: 'Mögliche Mangelernährung' };
}

export function leeresErnaehrungsprofil(): Ernaehrungsprofil {
  return {
    mna_gewichtsverlust: 3,
    mna_mobilitaet: 2,
    mna_stress: 2,
    mna_neuropsych: 2,
    mna_bmi: 3,
    kostform: 'normal',
    dysphagie_level: 7,
    nahrungsmittelallergien: [],
    unvertraeglichkeiten: [],
    flüssigkeitsbedarf_ml: 1500,
    kalorienziel_kcal: undefined,
    proteinziel_g: undefined,
    besonderheiten: '',
    ernaehrungsberater: '',
  };
}

export function leeresFluessigkeitsbilanz(datum: string): Fluessigkeitsbilanz {
  return {
    bilanz_datum: datum,
    trinkmenge_ml: 0,
    nahrung_ml: 0,
    infusion_ml: 0,
    urin_ml: 0,
    sonstiges_ml: 0,
    einzel_getraenke: [],
    notizen: '',
  };
}

export function berechneProzentBedarf(istMl: number, bedarfMl: number): number {
  if (!bedarfMl) return 0;
  return Math.min(100, Math.round((istMl / bedarfMl) * 100));
}

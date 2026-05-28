// lib/sturzpraevention/assessment.ts — Morse Fall Scale

export interface SturzAssessment {
  id?: string;
  user_id?: string;
  assessment_datum: string;
  sturzhistorie: 0 | 25;
  zweitdiagnose: 0 | 15;
  gehhilfe: 0 | 15 | 30;
  heparin_iv: 0 | 20;
  gangbild: 0 | 10 | 20;
  orientierung: 0 | 15;
  gesamtscore?: number;
  risikostufe?: string;
  massnahmen: string[];
  notizen?: string;
  durchgefuehrt_von?: string;
  naechstes_assessment?: string;
  erstellt_am?: string;
}

export interface Sturzereignis {
  id?: string;
  user_id?: string;
  ereignis_datum: string;
  ort?: string;
  ursache?: string;
  verletzung?: string;
  arzt_informiert: boolean;
  krankenhauseinw: boolean;
  massnahmen_nach?: string;
  notizen?: string;
}

export const MORSE_ITEMS = [
  { key: 'sturzhistorie', label: 'Sturzanamnese', options: [{ v: 0, l: 'Kein Sturz in den letzten 3 Monaten' }, { v: 25, l: 'Sturz in den letzten 3 Monaten' }] },
  { key: 'zweitdiagnose', label: 'Sekundärdiagnose', options: [{ v: 0, l: 'Keine weitere Diagnose' }, { v: 15, l: 'Mehr als eine Diagnose' }] },
  { key: 'gehhilfe', label: 'Gehhilfe', options: [{ v: 0, l: 'Keine / Bettruhe / Rollstuhl / Pflegeperson' }, { v: 15, l: 'Krücken / Gehstock / Rollator' }, { v: 30, l: 'Hält sich an Möbeln fest' }] },
  { key: 'heparin_iv', label: 'Heparin / IV-Zugang', options: [{ v: 0, l: 'Nein' }, { v: 20, l: 'Ja' }] },
  { key: 'gangbild', label: 'Gangbild / Bewegungsübergang', options: [{ v: 0, l: 'Normal / Bettlägerig / Rollstuhl' }, { v: 10, l: 'Leicht beeinträchtigt' }, { v: 20, l: 'Stark beeinträchtigt' }] },
  { key: 'orientierung', label: 'Kognitive Status', options: [{ v: 0, l: 'Orientiert zu eigenen Fähigkeiten' }, { v: 15, l: 'Überschätzt eigene Fähigkeiten / vergisst Einschränkungen' }] },
] as const;

export const PRAEVENTION_MASSNAHMEN = [
  'Rutschfeste Socken', 'Haltegriffe installieren', 'Nachttischlampe', 'Rollator bereitstellen',
  'Bett absenken', 'Sturzmelder', 'Freie Wege', 'Rutschmatten entfernen', 'Physiotherapie',
  'Gleichgewichtsübungen', 'Medikamente überprüfen', 'Sehkraft prüfen lassen',
];

export function berechneRisiko(score: number): { stufe: string; farbe: string; beschr: string } {
  if (score < 25) return { stufe: 'Gering', farbe: 'green', beschr: 'Kein besonderes Sturzrisiko' };
  if (score < 45) return { stufe: 'Mittel', farbe: 'yellow', beschr: 'Standardmaßnahmen zur Sturzverhütung einleiten' };
  return { stufe: 'Hoch', farbe: 'red', beschr: 'Hohes Sturzrisiko — intensive Präventionsmaßnahmen erforderlich' };
}

export function leeresAssessment(): SturzAssessment {
  return {
    assessment_datum: new Date().toISOString().split('T')[0],
    sturzhistorie: 0, zweitdiagnose: 0, gehhilfe: 0, heparin_iv: 0, gangbild: 0, orientierung: 0,
    massnahmen: [], notizen: '', durchgefuehrt_von: '',
  };
}

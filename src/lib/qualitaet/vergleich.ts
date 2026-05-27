export const SCORE_LABELS = {
  score_pflege: 'Pflege & Betreuung',
  score_medizin: 'Medizinische Versorgung',
  score_soziales: 'Soziales Leben',
  score_unterkunft: 'Unterkunft & Verpflegung',
  score_gesamt: 'Gesamtnote',
} as const;

export type ScoreKey = keyof typeof SCORE_LABELS;

export function renderSterne(score: number): string {
  const full = Math.floor(score);
  const half = score - full >= 0.5 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
}

export function getScoreColor(score: number): string {
  if (score >= 4.5) return 'text-green-600';
  if (score >= 4.0) return 'text-lime-600';
  if (score >= 3.5) return 'text-yellow-600';
  if (score >= 3.0) return 'text-orange-600';
  return 'text-red-600';
}

export function getScoreBg(score: number): string {
  if (score >= 4.5) return 'bg-green-50 border-green-200';
  if (score >= 4.0) return 'bg-lime-50 border-lime-200';
  if (score >= 3.5) return 'bg-yellow-50 border-yellow-200';
  if (score >= 3.0) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
}

export interface PflegeheimMitBericht {
  id: string;
  name: string;
  traeger: string | null;
  plz: string;
  ort: string;
  bundesland: string | null;
  telefon: string | null;
  plaetze_gesamt: number | null;
  qualitaetsberichte: Array<{
    pruefung_datum: string;
    score_pflege: number;
    score_medizin: number;
    score_soziales: number;
    score_unterkunft: number;
    score_gesamt: number;
    maengel_anzahl: number;
  }>;
}

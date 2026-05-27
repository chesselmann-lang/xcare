export type SterbensortOption = 'zuhause' | 'hospiz' | 'krankenhaus' | 'pflegeheim' | 'egal';

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 'intro', title: 'Einführung', description: 'Was ist eine Patientenverfügung?', icon: '📋' },
  { id: 'person', title: 'Persönliche Daten', description: 'Ihre Identität und Kontakt', icon: '👤' },
  { id: 'vertrauensperson', title: 'Vertrauensperson', description: 'Wer setzt Ihre Wünsche durch?', icon: '🤝' },
  { id: 'verfuegungen', title: 'Medizinische Verfügungen', description: 'Ihre Behandlungswünsche', icon: '🏥' },
  { id: 'sterbeprozess', title: 'Sterbeprozess', description: 'Ort und Begleitung', icon: '🌿' },
  { id: 'fertigstellung', title: 'Abschluss', description: 'Überprüfung und Speicherung', icon: '✅' },
];

export const VERFUEGUNGEN_LABELS: Record<string, { label: string; info: string }> = {
  lebenserhaltende_massnahmen: {
    label: 'Lebenserhaltende Maßnahmen',
    info: 'Intensivmedizinische Maßnahmen zur Lebensverlängerung, auch wenn keine Aussicht auf Genesung besteht.',
  },
  kuenstliche_ernaehrung: {
    label: 'Künstliche Ernährung',
    info: 'Ernährung über Magensonde oder Infusion, wenn eigenständige Nahrungsaufnahme nicht mehr möglich ist.',
  },
  beatmung: {
    label: 'Beatmung',
    info: 'Maschinelle Beatmungsunterstützung bei Atemversagen.',
  },
  wiederbelebung: {
    label: 'Wiederbelebung',
    info: 'Herz-Lungen-Wiederbelebung (Reanimation) bei Herzstillstand.',
  },
  schmerzlinderung: {
    label: 'Schmerzlinderung (Palliativmedizin)',
    info: 'Konsequente Schmerzbekämpfung und Linderung von Beschwerden, auch wenn dies den Sterbeprozess beschleunigen könnte.',
  },
  palliative_massnahmen: {
    label: 'Palliative Begleitung',
    info: 'Umfassende Betreuung zur Linderung von Leiden, psychologische und spirituelle Begleitung.',
  },
  organspende: {
    label: 'Organspende',
    info: 'Bereitschaft zur Organspende nach dem Tod.',
  },
};

export const STERBEORT_OPTIONS: Array<{ value: SterbensortOption; label: string; icon: string }> = [
  { value: 'zuhause', label: 'Zuhause', icon: '🏠' },
  { value: 'hospiz', label: 'Hospiz', icon: '🌿' },
  { value: 'pflegeheim', label: 'Pflegeheim', icon: '🏥' },
  { value: 'krankenhaus', label: 'Krankenhaus', icon: '🏨' },
  { value: 'egal', label: 'Kein Wunsch', icon: '🔄' },
];

export function berechneVervollstaendigung(pv: Partial<{
  vollstaendiger_name: string;
  vertrauensperson_name: string;
  verfuegungen: Record<string, boolean | null>;
  ort_des_sterbens: string;
  unterschrift_datum: string;
}>): number {
  let punkte = 0;
  if (pv.vollstaendiger_name) punkte += 20;
  if (pv.vertrauensperson_name) punkte += 20;
  if (pv.verfuegungen && Object.values(pv.verfuegungen).some(v => v !== null)) punkte += 30;
  if (pv.ort_des_sterbens) punkte += 15;
  if (pv.unterschrift_datum) punkte += 15;
  return punkte;
}

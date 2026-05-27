export const ZUSTAND_LABELS: Record<string, string> = {
  neuwertig: 'Neuwertig',
  gut: 'Guter Zustand',
  gebraucht: 'Gebraucht',
};

export const PREIS_LABELS: Record<string, string> = {
  kostenlos: 'Kostenlos',
  spende: 'Gegen Spende',
  miete: 'Miete',
};

export const LEIHZEITRAUM_LABELS: Record<string, string> = {
  kurzzeit: 'Kurzzeit (< 3 Monate)',
  mittel: 'Mittelfristig (3–12 Monate)',
  langzeit: 'Langfristig (> 12 Monate)',
  unbefristet: 'Unbefristet',
};

export function getZustandColor(zustand: string): string {
  if (zustand === 'neuwertig') return 'bg-green-100 text-green-700';
  if (zustand === 'gut') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-600';
}

export function getPreisColor(preis: string): string {
  if (preis === 'kostenlos') return 'bg-green-100 text-green-700';
  if (preis === 'spende') return 'bg-amber-100 text-amber-700';
  return 'bg-purple-100 text-purple-700';
}

export interface Kategorie {
  id: string;
  name: string;
  icon: string;
}

export interface Angebot {
  id: string;
  user_id: string;
  kategorie_id: string;
  beschreibung: string;
  zustand: string;
  plz: string;
  ort: string;
  preis_art: string;
  preis_monat_cent: number;
  kontakt_email: string | null;
  kontakt_telefon: string | null;
  status: string;
  erstellt_am: string;
  hilfsmittel_kategorien?: Kategorie;
}

export interface Bedarf {
  id: string;
  user_id: string;
  kategorie_id: string;
  beschreibung: string;
  plz: string;
  ort: string;
  leihzeitraum: string;
  kontakt_email: string | null;
  kontakt_telefon: string | null;
  status: string;
  erstellt_am: string;
  hilfsmittel_kategorien?: Kategorie;
}

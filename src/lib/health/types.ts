// ============================================
// xcare – Health-Tresor Typen
// ============================================

export type DarreichungsformTyp =
  | "Tablette"
  | "Kapsel"
  | "Tropfen"
  | "Injektion"
  | "Pflaster"
  | "Saft"
  | "Salbe"
  | "Zäpfchen"
  | "Spray"
  | "Sonstiges";

export const DARREICHUNGSFORMEN: DarreichungsformTyp[] = [
  "Tablette",
  "Kapsel",
  "Tropfen",
  "Injektion",
  "Pflaster",
  "Saft",
  "Salbe",
  "Zäpfchen",
  "Spray",
  "Sonstiges",
];

export interface Medikament {
  id: string;
  profil_id: string;
  name: string;
  wirkstoff: string | null;
  staerke: string | null;
  darreichungsform: DarreichungsformTyp | null;
  morgens: number;
  mittags: number;
  abends: number;
  nachts: number;
  einheit: string;
  hinweis: string | null;
  verordnet_von: string | null;
  seit_datum: string | null;  // ISO date string
  bis_datum: string | null;   // ISO date string, null = Dauermedikation
  aktiv: boolean;
  created_at: string;
  updated_at: string;
}

export interface Diagnose {
  id: string;
  profil_id: string;
  icd10_code: string | null;
  bezeichnung: string;
  erstdiagnose: string | null; // ISO date string
  arzt: string | null;
  notizen: string | null;
  chronisch: boolean;
  created_at: string;
}

export interface Impfung {
  id: string;
  profil_id: string;
  impfstoff: string;
  krankheit: string;
  datum: string;           // ISO date string
  naechste_impfung: string | null; // ISO date string
  arzt: string | null;
  charge: string | null;
  created_at: string;
}

// ============================================
// xcare — Haushalt-Typen (Phase 2B)
// ============================================

export type HaushaltRolle =
  | "pflegebeduerftig"
  | "pflegeperson"
  | "betreuer"
  | "vormund"
  | "bevollmaechtigter"
  | "kind"
  | "angehoeriger";

export type VollmachtTyp =
  | "generalvollmacht"
  | "vorsorgevollmacht"
  | "betreuungsverfuegung"
  | "patientenverfuegung"
  | "sorgerechtsverfuegung";

export interface Haushalt {
  id: string;
  name: string;
  plz: string | null;
  ort: string | null;
  erstellt_von: string | null;
  created_at: string;
  updated_at: string;
}

export interface Haushaltsmitglied {
  id: string;
  haushalt_id: string;
  profile_id: string | null;
  vorname: string | null;
  nachname: string | null;
  geburtsdatum: string | null;
  rolle: HaushaltRolle;
  pflegegrad: number | null;
  gdb: number | null;
  kann_anfragen_sehen: boolean;
  kann_dokumente_sehen: boolean;
  kann_verwalten: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vollmacht {
  id: string;
  haushalt_id: string;
  vollmachtgeber_id: string | null;
  bevollmaechtigter_id: string | null;
  typ: VollmachtTyp;
  titel: string;
  beschreibung: string | null;
  gueltig_ab: string | null;
  gueltig_bis: string | null;
  notariell: boolean;
  registriert_beim: string | null;
  dokument_id: string | null;
  aktiv: boolean;
  created_at: string;
  updated_at: string;
}

// Labels für UI
export const HAUSHALT_ROLLEN_LABELS: Record<HaushaltRolle, string> = {
  pflegebeduerftig: "Pflegebedürftig",
  pflegeperson: "Pflegeperson",
  betreuer: "Rechtlicher Betreuer",
  vormund: "Vormund",
  bevollmaechtigter: "Bevollmächtigte Person",
  kind: "Kind",
  angehoeriger: "Angehöriger",
};

export const VOLLMACHT_TYP_LABELS: Record<VollmachtTyp, string> = {
  generalvollmacht: "Generalvollmacht",
  vorsorgevollmacht: "Vorsorgevollmacht",
  betreuungsverfuegung: "Betreuungsverfügung",
  patientenverfuegung: "Patientenverfügung",
  sorgerechtsverfuegung: "Sorgerechtsverfügung",
};

// Formulare
export interface HaushaltErstellenInput {
  name: string;
  plz?: string;
  ort?: string;
}

export interface MitgliedHinzufuegenInput {
  vorname: string;
  nachname: string;
  rolle: HaushaltRolle;
  pflegegrad?: number | null;
  geburtsdatum?: string | null;
}

export interface VollmachtErstellenInput {
  typ: VollmachtTyp;
  titel: string;
  beschreibung?: string;
  gueltig_ab?: string;
  gueltig_bis?: string;
  notariell: boolean;
  registriert_beim?: string;
}

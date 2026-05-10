// ============================================
// xcare – Pflegeplan Typen (Phase 3A)
// ============================================

// --- Pflegeziele ---

export type PflegezielKategorie =
  | "allgemein"
  | "mobilitaet"
  | "ernaehrung"
  | "soziales"
  | "gesundheit"
  | "selbststaendigkeit"
  | "wohlbefinden";

export const PFLEGEZIEL_KATEGORIEN: { value: PflegezielKategorie; label: string }[] = [
  { value: "allgemein", label: "Allgemein" },
  { value: "mobilitaet", label: "Mobilität" },
  { value: "ernaehrung", label: "Ernährung" },
  { value: "soziales", label: "Soziales" },
  { value: "gesundheit", label: "Gesundheit" },
  { value: "selbststaendigkeit", label: "Selbstständigkeit" },
  { value: "wohlbefinden", label: "Wohlbefinden" },
];

export const PFLEGEZIEL_PRIORITAET_LABEL: Record<number, string> = {
  1: "Hoch",
  2: "Mittel",
  3: "Niedrig",
};

export interface Pflegeziel {
  id: string;
  profil_id: string;
  titel: string;
  beschreibung: string | null;
  kategorie: PflegezielKategorie;
  prioritaet: 1 | 2 | 3;
  erreicht: boolean;
  ziel_datum: string | null;
  created_at: string;
  updated_at: string;
}

// --- Pflegeaufgaben ---

export type AufgabeHaeufigkeit = "taeglich" | "woechentlich" | "monatlich" | "bei_bedarf";

export const AUFGABE_HAEUFIGKEIT_LABEL: Record<AufgabeHaeufigkeit, string> = {
  taeglich: "Täglich",
  woechentlich: "Wöchentlich",
  monatlich: "Monatlich",
  bei_bedarf: "Bei Bedarf",
};

export interface Pflegeaufgabe {
  id: string;
  profil_id: string;
  ziel_id: string | null;
  titel: string;
  beschreibung: string | null;
  haeufigkeit: AufgabeHaeufigkeit;
  uhrzeit: string | null;
  verantwortlich: string | null;
  erledigt_heute: boolean;
  aktiv: boolean;
  created_at: string;
  updated_at: string;
}

// --- Pflegetermine ---

export type TerminTyp = "arzt" | "therapie" | "behoerde" | "pflege" | "sonstiges";

export const TERMIN_TYP_LABEL: Record<TerminTyp, string> = {
  arzt: "Arzt",
  therapie: "Therapie",
  behoerde: "Behörde",
  pflege: "Pflege",
  sonstiges: "Sonstiges",
};

export const TERMIN_TYP_COLOR: Record<TerminTyp, string> = {
  arzt: "bg-blue-100 text-blue-800 border-blue-200",
  therapie: "bg-green-100 text-green-800 border-green-200",
  behoerde: "bg-orange-100 text-orange-800 border-orange-200",
  pflege: "bg-purple-100 text-purple-800 border-purple-200",
  sonstiges: "bg-gray-100 text-gray-700 border-gray-200",
};

export interface Pflegetermin {
  id: string;
  profil_id: string;
  titel: string;
  beschreibung: string | null;
  termin_typ: TerminTyp;
  datum: string;
  dauer_minuten: number | null;
  ort: string | null;
  anbieter_id: string | null;
  erinnerung_tage: number | null;
  erledigt: boolean;
  notizen: string | null;
  created_at: string;
  updated_at: string;
}

// --- Notfallkontakte ---

export type Beziehung =
  | "ehepartner"
  | "elternteil"
  | "kind"
  | "geschwister"
  | "arzt"
  | "pflegedienst"
  | "betreuer"
  | "freund"
  | "nachbar"
  | "sonstiges";

export const BEZIEHUNG_LABEL: Record<Beziehung, string> = {
  ehepartner: "Ehepartner/in",
  elternteil: "Elternteil",
  kind: "Kind",
  geschwister: "Geschwister",
  arzt: "Arzt / Ärztin",
  pflegedienst: "Pflegedienst",
  betreuer: "Betreuer/in",
  freund: "Freund/in",
  nachbar: "Nachbar/in",
  sonstiges: "Sonstiges",
};

export interface Notfallkontakt {
  id: string;
  profil_id: string;
  name: string;
  beziehung: string | null;
  telefon: string;
  email: string | null;
  adresse: string | null;
  ist_hauptkontakt: boolean;
  sortierung: number;
  created_at: string;
  updated_at: string;
}

// --- Pflegetagebuch ---

export const STIMMUNG_EMOJI: Record<number, string> = {
  1: "😢",
  2: "😟",
  3: "😐",
  4: "🙂",
  5: "😊",
};

export const STIMMUNG_LABEL: Record<number, string> = {
  1: "Sehr schlecht",
  2: "Schlecht",
  3: "Neutral",
  4: "Gut",
  5: "Sehr gut",
};

export interface Pflegetagebucheintrag {
  id: string;
  profil_id: string;
  eintrag_datum: string;
  stimmung: number | null;
  schlaf_stunden: number | null;
  schmerzen: number | null;
  aktivitaeten: string | null;
  notizen: string | null;
  erstellt_von: string | null;
  created_at: string;
  updated_at: string;
}

// --- Pflegekosten ---

export type KostenKategorie =
  | "pflegehilfsmittel"
  | "medikamente"
  | "arzt"
  | "therapie"
  | "haushaltshilfe"
  | "fahrtkosten"
  | "unterkunft"
  | "sonstiges";

export const KOSTEN_KATEGORIE_LABEL: Record<KostenKategorie, string> = {
  pflegehilfsmittel: "Pflegehilfsmittel",
  medikamente: "Medikamente",
  arzt: "Arzt / Ärztin",
  therapie: "Therapie",
  haushaltshilfe: "Haushaltshilfe",
  fahrtkosten: "Fahrtkosten",
  unterkunft: "Unterkunft",
  sonstiges: "Sonstiges",
};

export const KOSTEN_KATEGORIE_COLOR: Record<KostenKategorie, string> = {
  pflegehilfsmittel: "#6366f1",
  medikamente: "#ec4899",
  arzt: "#3b82f6",
  therapie: "#10b981",
  haushaltshilfe: "#f59e0b",
  fahrtkosten: "#8b5cf6",
  unterkunft: "#ef4444",
  sonstiges: "#6b7280",
};

export interface Pflegekosten {
  id: string;
  profil_id: string;
  buchungsdatum: string;
  betrag: number;
  kategorie: KostenKategorie;
  beschreibung: string;
  belegnummer: string | null;
  erstattung: number;
  created_at: string;
  updated_at: string;
}

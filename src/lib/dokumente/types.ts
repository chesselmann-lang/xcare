// ============================================
// xcare — Dokumenten-Tresor-Typen (Phase 2C)
// ============================================

export type DokumentKategorie =
  | "ausweis"
  | "bescheid"
  | "vollmacht"
  | "gesundheit"
  | "versicherung"
  | "steuer"
  | "immobilie"
  | "sonstiges";

export interface Dokument {
  id: string;
  haushalt_id: string | null;
  profil_id: string;
  name: string;
  kategorie: DokumentKategorie;
  storage_path: string;
  verschluesselt: boolean;
  mime_type: string | null;
  groesse_bytes: number | null;
  ocr_text: string | null;
  geteilt_mit: string[] | null;
  ablaufdatum: string | null;
  notizen: string | null;
  created_at: string;
  updated_at: string;
}

export interface DokumentErstellenInput {
  name: string;
  kategorie: DokumentKategorie;
  storage_path: string;
  mime_type?: string;
  groesse_bytes?: number;
  ablaufdatum?: string;
  notizen?: string;
  haushalt_id?: string;
}

export interface DokumentAktualisierenInput {
  name?: string;
  kategorie?: DokumentKategorie;
  ablaufdatum?: string | null;
  notizen?: string | null;
  geteilt_mit?: string[];
}

// Labels und Icons für UI
export const DOKUMENT_KATEGORIE_LABELS: Record<DokumentKategorie, string> = {
  ausweis: "Ausweis",
  bescheid: "Bescheid",
  vollmacht: "Vollmacht",
  gesundheit: "Gesundheit",
  versicherung: "Versicherung",
  steuer: "Steuer",
  immobilie: "Immobilie",
  sonstiges: "Sonstiges",
};

export const DOKUMENT_KATEGORIE_EMOJI: Record<DokumentKategorie, string> = {
  ausweis: "🪪",
  bescheid: "📋",
  vollmacht: "✍️",
  gesundheit: "🏥",
  versicherung: "🛡️",
  steuer: "📊",
  immobilie: "🏠",
  sonstiges: "📁",
};

export const DOKUMENT_KATEGORIEN: DokumentKategorie[] = [
  "ausweis",
  "bescheid",
  "vollmacht",
  "gesundheit",
  "versicherung",
  "steuer",
  "immobilie",
  "sonstiges",
];

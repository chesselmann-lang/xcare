// ============================================
// xcare – Deterministische Anspruchs-Engine
// Typen-Definitionen
//
// WICHTIG: Kein LLM entscheidet hier. Alle Berechnungen
// sind deterministisch nach geltendem Recht (Stand 2025).
// FB-31 / FB-125 Compliance.
// ============================================

// ---------- INPUT ----------

export type Pflegegrad = 1 | 2 | 3 | 4 | 5;
export type GdB = 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100;
export type Familienstand = "ledig" | "verheiratet" | "geschieden" | "verwitwet" | "eingetragen";
export type WohnForm = "privat" | "betreutes_wohnen" | "wohngemeinschaft" | "heim";
export type Versicherungsart = "gkv" | "pkv" | "beihilfe";

export interface AnspruchsInput {
  // Person
  alter: number;                          // Jahre
  familienstand: Familienstand;
  wohnform: WohnForm;
  versicherungsart: Versicherungsart;

  // Pflege (SGB XI)
  pflegegrad?: Pflegegrad;               // undefined = noch kein PG
  pflegegeld_kombinationsleistung?: boolean; // kombiniert Pflegegeld + Sachleistungen
  verhinderungspflege_genutzt_eur?: number; // in diesem Jahr bereits genutzt
  kurzzeitpflege_genutzt_eur?: number;

  // Behinderung (SGB IX)
  gdb?: GdB;                              // Grad der Behinderung
  merkzeichen?: SGB9Merkzeichen[];

  // Kinder (SGB VIII)
  kinder?: KindInput[];

  // Erwerb / Haushalt (§ 35a EStG)
  erwerbstaetig?: boolean;
  haushaltshilfe_aufwendungen_eur?: number; // Jahres-Ausgaben für Haushaltshilfe
  pflege_aufwendungen_eur?: number;          // Jahres-Ausgaben (selbst getragen)
  zu_versteuerndes_einkommen_eur?: number;   // für Einkommensabhängigkeit SGB XII

  // Angehörigen-Pflege
  pflege_durch_angehoerige?: boolean;        // unbezahlte Pflege durch Familie
  pflegeperson_berufstaetig?: boolean;       // Pflegeperson erwerbstätig (Rentenberechnung)

  // Lebenslage
  lebenslage: AnspruchsLebenslage;
}

export type SGB9Merkzeichen = "G" | "aG" | "B" | "H" | "Bl" | "Gl" | "TBl" | "RF";

export interface KindInput {
  alter: number;              // Jahre
  in_kita?: boolean;
  in_tagespflege?: boolean;
  behinderung?: boolean;
  pflegebedarf?: boolean;
}

export type AnspruchsLebenslage =
  | "alter_pflege"
  | "eingliederung_behinderung"
  | "erwerbsleben_vereinbarkeit"
  | "krankheit_genesung"
  | "geburt_fruehe_kindheit"
  | "schulkind_jugend"
  | "hospiz_palliativ"
  | "trauer_nachlass";

// ---------- OUTPUT ----------

export interface AnspruchsErgebnis {
  /** ISO-Zeitstempel der Berechnung */
  berechnungsdatum: string;
  /** Eingabe, die zur Berechnung geführt hat (für Audit-Trail) */
  input: AnspruchsInput;
  /** Alle ermittelten Ansprüche */
  ansprueche: Anspruch[];
  /** Summe monatlicher Geldleistungen */
  gesamt_monatlich_eur: number;
  /** Summe jährlicher Geldleistungen */
  gesamt_jaehrlich_eur: number;
  /** Steuerersparnis (§ 35a EStG) pro Jahr */
  steuerersparnis_eur: number;
  /** Empfohlene nächste Schritte */
  naechste_schritte: NaechsterSchritt[];
  /** Offene Fragen, die für genauere Berechnung nötig wären */
  offene_fragen: string[];
  /** Hinweise auf Beratungsstellen */
  beratungsstellen: Beratungsstelle[];
}

export interface Anspruch {
  id: string;
  titel: string;
  rechtsgrundlage: string;           // z.B. "§ 37 SGB XI"
  beschreibung: string;
  betrag_monatlich_eur?: number;
  betrag_jaehrlich_eur?: number;
  betrag_einmalig_eur?: number;
  betrag_hinweis?: string;           // wenn nicht exakt berechenbar
  voraussetzungen_erfuellt: boolean;
  voraussetzungen_details: string[];
  antrag_bei: string;                // Pflegekasse, Sozialamt, Finanzamt etc.
  antrag_hinweis?: string;
  kombinierbar_mit?: string[];       // IDs anderer Ansprüche
  nicht_kombinierbar_mit?: string[]; // Ausschlussregeln
  kategorie: AnspruchsKategorie;
  prioritaet: 1 | 2 | 3;            // 1 = höchste Priorität
}

export type AnspruchsKategorie =
  | "pflegeversicherung"    // SGB XI
  | "sozialhilfe"           // SGB XII
  | "eingliederungshilfe"   // SGB IX
  | "jugendhilfe"           // SGB VIII
  | "steuer"                // EStG
  | "rentenversicherung"    // Pflegepersonen-Rente
  | "unfallversicherung"    // Pflegepersonen-UV
  | "haushaltshilfe";       // Diverse

export interface NaechsterSchritt {
  reihenfolge: number;
  titel: string;
  beschreibung: string;
  dringlichkeit: "sofort" | "diese_woche" | "diesen_monat" | "langfristig";
  zustaendig: string;
}

export interface Beratungsstelle {
  name: string;
  typ: "pflegestuetzpunkt" | "sozialamt" | "vdk" | "vza" | "caritas" | "diakonie" | "sonstige";
  bundesweit_verfuegbar: boolean;
  telefon?: string;
  website?: string;
}

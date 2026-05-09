// ============================================
// xcare — Core-Typen
// ============================================

export type UserRole = "familie" | "anbieter" | "admin";

export interface Profile {
  id: string;
  user_id: string;
  role: UserRole;
  vorname: string | null;
  nachname: string | null;
  email: string;
  telefon: string | null;
  plz: string | null;
  ort: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Anbieter {
  id: string;
  profile_id: string;
  name: string;
  beschreibung: string | null;
  traeger: string | null; // gGmbH, e.V., GmbH
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  lat: number | null;
  lng: number | null;
  telefon: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  verifiziert: boolean;
  aktiv: boolean;
  created_at: string;
  updated_at: string;
}

export interface Leistung {
  id: string;
  anbieter_id: string;
  name: string;
  beschreibung: string | null;
  kategorie: LeistungsKategorie;
  lebenslage: LebenslageTyp[];
  sgb_paragraf: string | null; // z.B. "SGB XI §39"
  kostentraeger: Kostentraeger[];
  preis_von: number | null;
  preis_bis: number | null;
  kapazitaet: number | null;
  wartezeit_wochen: number | null;
  aktiv: boolean;
  created_at: string;
}

export interface Anfrage {
  id: string;
  familie_id: string;
  leistung_id: string | null;
  anbieter_id: string | null;
  lebenslage: LebenslageTyp;
  beschreibung: string;
  status: AnfrageStatus;
  ki_empfehlung: string | null;
  created_at: string;
  updated_at: string;
}

export interface KiEmpfehlung {
  leistungen: {
    id: string;
    name: string;
    anbieter_name: string;
    begruendung: string;
    match_score: number;
    entfernung_km: number | null;
  }[];
  narrative: string;
  rechtsgrundlage: string[];
  naechste_schritte: string[];
}

// Enums
export type LebenslageTyp =
  | "geburt_fruehe_kindheit"
  | "schulkind_jugend"
  | "eingliederung_behinderung"
  | "erwerbsleben_vereinbarkeit"
  | "krankheit_genesung"
  | "alter_pflege"
  | "hospiz_palliativ"
  | "trauer_nachlass";

export type LeistungsKategorie =
  | "pflege_ambulant"
  | "pflege_stationaer"
  | "tagespflege"
  | "kurzzeitpflege"
  | "beratung"
  | "foerderung"
  | "therapie"
  | "haushaltshilfe"
  | "kinderbetreuung"
  | "jugendhilfe"
  | "eingliederungshilfe"
  | "hospizdienst"
  | "trauerhilfe"
  | "sonstiges";

export type Kostentraeger =
  | "gkv"
  | "sgb_xi"
  | "sgb_viii"
  | "sgb_ix"
  | "sgb_ii_xii"
  | "selbstzahler"
  | "stiftung";

export type AnfrageStatus =
  | "offen"
  | "in_bearbeitung"
  | "angeboten"
  | "bestaetigt"
  | "abgelehnt"
  | "abgeschlossen";

// Wizard
export interface WizardSchritt {
  id: string;
  frage: string;
  typ: "single" | "multi" | "text" | "number" | "date";
  optionen?: { value: string; label: string; icon?: string }[];
  pflichtfeld: boolean;
}

export interface WizardAntwort {
  schritt_id: string;
  wert: string | string[] | number;
}

export interface WizardContext {
  lebenslage: LebenslageTyp;
  antworten: WizardAntwort[];
  plz: string;
  completed: boolean;
}

// Suche
export interface SuchFilter {
  plz: string;
  umkreis_km: number;
  kategorie?: LeistungsKategorie;
  lebenslage?: LebenslageTyp;
  kostentraeger?: Kostentraeger;
  nur_verfuegbar?: boolean;
}

export interface AnbieterMitLeistungen extends Anbieter {
  leistungen: Leistung[];
  entfernung_km?: number;
}

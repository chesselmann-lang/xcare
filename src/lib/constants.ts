import type { LebenslageTyp, LeistungsKategorie, Kostentraeger } from "./types";

export const LEBENSLAGEN: Record<
  LebenslageTyp,
  { label: string; emoji: string; farbe: string; beschreibung: string }
> = {
  geburt_fruehe_kindheit: {
    label: "Geburt & frühe Kindheit",
    emoji: "👶",
    farbe: "#FFF3CD",
    beschreibung: "Schwangerschaft, Geburt, Frühförderung (0–6 Jahre)",
  },
  schulkind_jugend: {
    label: "Schulkind & Jugend",
    emoji: "🎒",
    farbe: "#D1ECF1",
    beschreibung: "Schulische Inklusion, Jugendhilfe (6–18 Jahre)",
  },
  eingliederung_behinderung: {
    label: "Behinderung & Eingliederung",
    emoji: "♿",
    farbe: "#D4EDDA",
    beschreibung: "SGB IX, Eingliederungshilfe, Teilhabe",
  },
  erwerbsleben_vereinbarkeit: {
    label: "Erwerbsleben & Vereinbarkeit",
    emoji: "💼",
    farbe: "#E8F4F8",
    beschreibung: "Pflege + Beruf, Elternzeit, Unterstützung",
  },
  krankheit_genesung: {
    label: "Krankheit & Genesung",
    emoji: "🏥",
    farbe: "#FDE8E8",
    beschreibung: "Rehabilitation, ambulante Versorgung",
  },
  alter_pflege: {
    label: "Alter & Pflege",
    emoji: "🧓",
    farbe: "#E8E4F0",
    beschreibung: "SGB XI Pflegegrade, ambulant/stationär",
  },
  hospiz_palliativ: {
    label: "Hospiz & Palliativ",
    emoji: "🕊️",
    farbe: "#F0F0F0",
    beschreibung: "Begleitung am Lebensende, Schmerztherapie",
  },
  trauer_nachlass: {
    label: "Trauer & Nachlass",
    emoji: "🌷",
    farbe: "#F5F0FF",
    beschreibung: "Trauerbegleitung, Nachlassberatung",
  },
};

export const LEISTUNGSKATEGORIEN: Record<LeistungsKategorie, string> = {
  pflege_ambulant: "Ambulante Pflege",
  pflege_stationaer: "Stationäre Pflege",
  tagespflege: "Tagespflege",
  kurzzeitpflege: "Kurzzeitpflege",
  beratung: "Beratung",
  foerderung: "Förderung",
  therapie: "Therapie",
  haushaltshilfe: "Haushaltshilfe",
  kinderbetreuung: "Kinderbetreuung",
  jugendhilfe: "Jugendhilfe",
  eingliederungshilfe: "Eingliederungshilfe",
  hospizdienst: "Hospizdienst",
  trauerhilfe: "Trauerhilfe",
  sonstiges: "Sonstiges",
};

export const KOSTENTRAEGER: Record<Kostentraeger, string> = {
  gkv: "Gesetzliche Krankenversicherung",
  sgb_xi: "Pflegeversicherung (SGB XI)",
  sgb_viii: "Jugendhilfe (SGB VIII)",
  sgb_ix: "Eingliederungshilfe (SGB IX)",
  sgb_ii_xii: "Grundsicherung (SGB II/XII)",
  selbstzahler: "Selbstzahler",
  stiftung: "Stiftung/Förderung",
};

export const UMKREIS_OPTIONEN = [5, 10, 20, 30, 50] as const;

export const NAV_LINKS_FAMILIE = [
  { href: "/familie", label: "Übersicht", icon: "LayoutDashboard" },
  { href: "/lotse", label: "Lebenslage-Lotse", icon: "Compass" },
  { href: "/suche", label: "Anbieter suchen", icon: "Search" },
  { href: "/familie/anfragen", label: "Meine Anfragen", icon: "FileText" },
  { href: "/familie/favoriten", label: "Favoriten", icon: "Heart" },
];

export const NAV_LINKS_ANBIETER = [
  { href: "/anbieter", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/anbieter/profil", label: "Mein Profil", icon: "Building2" },
  { href: "/anbieter/leistungen", label: "Leistungen", icon: "Package" },
  { href: "/anbieter/anfragen", label: "Anfragen", icon: "MessageSquare" },
];

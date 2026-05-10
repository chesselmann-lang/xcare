// ============================================
// xcare — Intelligentes Anbieter-Matching (Phase 3C)
// ============================================
//
// Scoring-Algorithmus (max. 100 Punkte):
//   Pflegegrad-Passung : 0 oder 30 Punkte
//   Lebenslage-Match   : 0–25 Punkte
//   PLZ-Nähe           : 0–20 Punkte
//   Bewertung          : 0–15 Punkte (normalisiert aus bewertung_schnitt)
//   Verifiziert        : +10 Punkte

import type { LebenslageTyp, LeistungsKategorie } from "@/lib/types";

// ─── Typen ──────────────────────────────────────────────────────────────────

export interface MatchingInput {
  pflegegrad?: number;
  lebenslage?: string[];
  plz?: string;
}

export interface AnbieterRaw {
  id: string;
  name: string;
  beschreibung: string | null;
  kategorie: string[] | null;
  plz: string | null;
  ort: string;
  verified: boolean;
  aktiv: boolean;
  bewertung_schnitt: number | null;
  leistungen: Array<{
    titel: string;
    beschreibung: string | null;
    lebenslage: string | null;
    preis_von: number | null;
    preis_bis: number | null;
    kategorie?: string | null;
  }>;
}

export interface AnbieterMatch {
  anbieter_id: string;
  name: string;
  score: number;
  score_breakdown: {
    pflegegrad: number;
    lebenslage: number;
    naehe: number;
    bewertung: number;
    verifiziert: number;
  };
  match_reason: string;
  kategorie: string[];
  ort: string;
  bewertung_schnitt: number | null;
  verified: boolean;
}

// ─── Hilfsmapping: Lebenslage → relevante Leistungskategorien ────────────────

const LEBENSLAGE_KATEGORIEN: Record<string, string[]> = {
  geburt_fruehe_kindheit: ["kinderbetreuung", "fruehfoerderung", "hebamme"],
  schulkind_jugend: ["jugendhilfe", "nachhilfe", "kinderbetreuung", "freizeitangebote"],
  eingliederung_behinderung: ["eingliederungshilfe", "behindertenbetreuung", "beratung", "therapie"],
  erwerbsleben_vereinbarkeit: ["kinderbetreuung", "beratung", "haushaltshilfe"],
  krankheit_genesung: ["pflege_ambulant", "therapie", "beratung", "krankenfahrten"],
  alter_pflege: [
    "pflege_ambulant",
    "pflege_stationaer",
    "tagespflege",
    "haushaltshilfe",
    "beratung",
    "hospizdienst",
  ],
  hospiz_palliativ: ["hospizdienst", "pflege_ambulant", "beratung"],
  trauer_nachlass: ["beratung", "hospizdienst"],
};

// Lebenslage-Keywords die in Beschreibungen gesucht werden
const LEBENSLAGE_KEYWORDS: Record<string, string[]> = {
  geburt_fruehe_kindheit: ["geburt", "baby", "kleinkind", "krippe", "hebamme", "früh", "säugling"],
  schulkind_jugend: ["jugend", "schule", "schulkind", "nachhilfe", "hort", "betreuung"],
  eingliederung_behinderung: ["behinderung", "eingliederung", "inklusion", "teilhabe", "handicap"],
  erwerbsleben_vereinbarkeit: ["beruf", "vereinbarkeit", "arbeit", "wiedereinstieg"],
  krankheit_genesung: ["krankheit", "genesung", "reha", "rehabilitation", "pflege", "therapie"],
  alter_pflege: ["pflege", "senioren", "alter", "alten", "demenzkranke", "demenz", "häuslich"],
  hospiz_palliativ: ["hospiz", "palliativ", "sterbend", "lebensend"],
  trauer_nachlass: ["trauer", "nachlass", "trauerbegleitung", "bestattung"],
};

// ─── Pflegegrad-Passung (0 oder 30 Punkte) ───────────────────────────────────
//
// Anbieter aus dem Pflegebereich (ambulant, stationär, Tages-) sind für
// Pflegegrad 2-5 relevant. Andere Kategorien ignorieren den Pflegegrad.

function berechnePflegegradScore(anbieter: AnbieterRaw, pflegegrad: number | undefined): number {
  if (!pflegegrad) return 15; // Kein Pflegegrad angegeben → neutral (halbe Punkte)

  const pflegekategorien = new Set([
    "pflege_ambulant",
    "pflege_stationaer",
    "tagespflege",
    "kurzzeitpflege",
    "verhinderungspflege",
  ]);

  const kategorien = anbieter.kategorie ?? [];
  const leistungsKategorien = anbieter.leistungen.map((l) => l.kategorie ?? "");
  const allKats = [...kategorien, ...leistungsKategorien];
  const hatPflegeangebot = allKats.some((k) => pflegekategorien.has(k));

  // Beschreibung auf Pflegewörter prüfen
  const beschreibung = (anbieter.beschreibung ?? "").toLowerCase();
  const pflegeWoerter = ["pflege", "pflegedienst", "pflegestufe", "pflegegrad", "sgb xi"];
  const hatPflegeworte = pflegeWoerter.some((w) => beschreibung.includes(w));

  const istPflegeanbieter = hatPflegeangebot || hatPflegeworte;

  if (!istPflegeanbieter) {
    // Kein Pflegeanbieter — Pflegegrad irrelevant, volle Punkte
    return 30;
  }

  // Pflegeanbieter: Pflegegrad 2+ ist Voraussetzung für die meisten Leistungen
  if (pflegegrad >= 2) return 30;
  if (pflegegrad === 1) return 10; // PG 1 hat eingeschränkten Anspruch
  return 0;
}

// ─── Lebenslage-Match (0–25 Punkte) ──────────────────────────────────────────

function berechneLebenslageScore(anbieter: AnbieterRaw, lebenslagen: string[] | undefined): number {
  if (!lebenslagen || lebenslagen.length === 0) return 0;

  let maxScore = 0;

  for (const lebenslage of lebenslagen) {
    let score = 0;
    const relevanteKategorien = LEBENSLAGE_KATEGORIEN[lebenslage] ?? [];
    const keywords = LEBENSLAGE_KEYWORDS[lebenslage] ?? [];

    const anbieterKategorien = anbieter.kategorie ?? [];
    const leistungsKategorien = anbieter.leistungen.map((l) => l.kategorie ?? "");
    const leistungsLebenslagen = anbieter.leistungen
      .map((l) => l.lebenslage ?? "")
      .filter(Boolean);
    const allKats = [...anbieterKategorien, ...leistungsKategorien];

    // Exakter Lebenslage-Treffer in Leistungen → höchster Wert
    if (leistungsLebenslagen.includes(lebenslage)) {
      score = Math.max(score, 25);
    }

    // Kategorie-Überschneidung
    const kategorieMatches = allKats.filter((k) => relevanteKategorien.includes(k)).length;
    if (kategorieMatches > 0) {
      score = Math.max(score, Math.min(20, 10 + kategorieMatches * 5));
    }

    // Keyword-Suche in Beschreibungen
    const searchTexts = [
      anbieter.beschreibung ?? "",
      ...anbieter.leistungen.map((l) => l.titel + " " + (l.beschreibung ?? "")),
    ]
      .join(" ")
      .toLowerCase();

    const keywordMatches = keywords.filter((kw) => searchTexts.includes(kw)).length;
    if (keywordMatches > 0) {
      score = Math.max(score, Math.min(15, keywordMatches * 5));
    }

    maxScore = Math.max(maxScore, score);
  }

  return Math.min(25, maxScore);
}

// ─── PLZ-Nähe (0–20 Punkte) ──────────────────────────────────────────────────

function berechnePLZScore(anbieterPlz: string | null, userPlz: string | undefined): number {
  if (!userPlz || !anbieterPlz) return 0;

  const a = anbieterPlz.trim();
  const u = userPlz.trim();

  if (a === u) return 20;
  if (a.length >= 3 && u.length >= 3 && a.substring(0, 3) === u.substring(0, 3)) return 15;
  if (a.length >= 2 && u.length >= 2 && a.substring(0, 2) === u.substring(0, 2)) return 10;
  if (a.length >= 1 && u.length >= 1 && a.substring(0, 1) === u.substring(0, 1)) return 5;
  return 0;
}

// ─── Bewertungs-Score (0–15 Punkte) ──────────────────────────────────────────
// bewertung_schnitt ist 1–5, normalisiert auf 0–15

function berechneBewertungsScore(bewertung_schnitt: number | null): number {
  if (!bewertung_schnitt) return 7; // Kein Durchschnitt → Mittelwert (kein Nachteil)
  // Skalierung: 1→0, 3→7.5, 5→15
  return Math.round(((bewertung_schnitt - 1) / 4) * 15);
}

// ─── Match-Reason (deutsche Erklärung) ────────────────────────────────────────

function erstelleMatchReason(
  anbieter: AnbieterRaw,
  input: MatchingInput,
  breakdown: AnbieterMatch["score_breakdown"]
): string {
  const gruende: string[] = [];

  if (breakdown.lebenslage >= 20) {
    const lebenslage = input.lebenslage?.[0];
    const label = lebenslage
      ? ({
          geburt_fruehe_kindheit: "Geburt & frühe Kindheit",
          schulkind_jugend: "Schulkind & Jugend",
          eingliederung_behinderung: "Eingliederung & Behinderung",
          erwerbsleben_vereinbarkeit: "Erwerbsleben & Vereinbarkeit",
          krankheit_genesung: "Krankheit & Genesung",
          alter_pflege: "Alter & Pflege",
          hospiz_palliativ: "Hospiz & Palliativ",
          trauer_nachlass: "Trauer & Nachlass",
        } as Record<string, string>)[lebenslage] ?? lebenslage
      : null;
    if (label) gruende.push(`Spezialist für ${label}`);
  } else if (breakdown.lebenslage >= 10) {
    gruende.push("Passende Leistungsangebote");
  }

  if (breakdown.naehe === 20) {
    gruende.push("In Ihrer PLZ-Region");
  } else if (breakdown.naehe >= 15) {
    gruende.push("In Ihrer Nähe");
  } else if (breakdown.naehe >= 10) {
    gruende.push("Im selben Postleitzahlbereich");
  }

  if (breakdown.verifiziert === 10) {
    gruende.push("Verifizierter Anbieter");
  }

  if (breakdown.pflegegrad === 30 && input.pflegegrad && input.pflegegrad >= 2) {
    gruende.push(`Geeignet für Pflegegrad ${input.pflegegrad}`);
  }

  if (breakdown.bewertung >= 12) {
    gruende.push("Hervorragend bewertet");
  } else if (breakdown.bewertung >= 9) {
    gruende.push("Gut bewertet");
  }

  if (gruende.length === 0) {
    gruende.push("Allgemeines Pflegeangebot in Deutschland");
  }

  return gruende.join(" · ");
}

// ─── Haupt-Funktion ───────────────────────────────────────────────────────────

export function berechneMatchingScore(anbieter: AnbieterRaw, input: MatchingInput): AnbieterMatch {
  const pflegegradPunkte = berechnePflegegradScore(anbieter, input.pflegegrad);
  const lebenslageP = berechneLebenslageScore(anbieter, input.lebenslage);
  const naeheP = berechnePLZScore(anbieter.plz, input.plz);
  const bewertungP = berechneBewertungsScore(anbieter.bewertung_schnitt);
  const verifiziertP = anbieter.verified ? 10 : 0;

  const score_breakdown = {
    pflegegrad: pflegegradPunkte,
    lebenslage: lebenslageP,
    naehe: naeheP,
    bewertung: bewertungP,
    verifiziert: verifiziertP,
  };

  const gesamtScore = Math.min(
    100,
    pflegegradPunkte + lebenslageP + naeheP + bewertungP + verifiziertP
  );

  const match_reason = erstelleMatchReason(anbieter, input, score_breakdown);

  return {
    anbieter_id: anbieter.id,
    name: anbieter.name,
    score: gesamtScore,
    score_breakdown,
    match_reason,
    kategorie: anbieter.kategorie ?? [],
    ort: anbieter.ort,
    bewertung_schnitt: anbieter.bewertung_schnitt,
    verified: anbieter.verified,
  };
}

// ─── Hilfsfunktion: Mehrere Anbieter ranken ───────────────────────────────────

export function rankAnbieter(
  anbieter: AnbieterRaw[],
  input: MatchingInput,
  limit = 5
): AnbieterMatch[] {
  return anbieter
    .map((a) => berechneMatchingScore(a, input))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

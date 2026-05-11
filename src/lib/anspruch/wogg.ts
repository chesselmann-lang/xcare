// ============================================
// WoGG – Wohngeld (Wohngeldstärkungs- und Heizkostenzuschussgesetz 2023/2025)
// Stand: 2025 (Wohngeld-Plus ab 1.1.2023, erhöht 2025)
//
// COMPLIANCE: Deterministisch, kein LLM (FB-31, FB-125)
// ============================================

import type { AnspruchsInput, Anspruch } from "./types";

// ── Wohngeld-Tabelle (vereinfacht nach Mietenstufe III, 2025) ─────────────
// Exakte Berechnung erfolgt durch Wohngeldbehörde mit Formel nach § 19 WoGG
// Wir verwenden eine Näherungsformel basierend auf Haushaltsgröße und Einkommen

interface WohngeldSatz {
  personen: number;
  maxMiete: number;    // € anrechenbare Höchstmiete (Mietenstufe III)
  grundbetrag: number; // ungefähres Wohngeld bei mittlerem Einkommen
}

const WOHNGELD_TABELLE_2025: WohngeldSatz[] = [
  { personen: 1, maxMiete: 543,  grundbetrag: 190 },
  { personen: 2, maxMiete: 659,  grundbetrag: 260 },
  { personen: 3, maxMiete: 789,  grundbetrag: 340 },
  { personen: 4, maxMiete: 919,  grundbetrag: 420 },
  { personen: 5, maxMiete: 1049, grundbetrag: 500 },
];

// Klimakomponente: +7,5 % seit 1.1.2023
const KLIMAKOMPONENTE = 0.075;

// Einkommensgrenzen für Wohngeld-Berechtigung 2025 (Jahreseinkommen, netto)
const EINKOMMENSGRENZEN: Record<number, number> = {
  1: 18_816,
  2: 25_532,
  3: 31_392,
  4: 37_464,
  5: 43_320,
};

export function berechneWoGG(input: AnspruchsInput): Anspruch[] {
  const ansprueche: Anspruch[] = [];

  // Wohngeld ist bei vielen Lebenslagen relevant
  const lebenslageRelevant = [
    "erwerbsleben_vereinbarkeit",
    "alter_pflege",
    "krankheit_genesung",
    "geburt_fruehe_kindheit",
    "schulkind_jugend",
    "eingliederung_behinderung",
  ].includes(input.lebenslage);

  if (!lebenslageRelevant) return ansprueche;

  const haushaltspersonen =
    1 + (input.kinder?.length ?? 0) +
    (input.familienstand === "verheiratet" || input.familienstand === "eingetragen" ? 1 : 0);

  const clampedPersonen = Math.min(haushaltspersonen, 5);
  const satz = WOHNGELD_TABELLE_2025[clampedPersonen - 1];
  const einkommensgrenze = EINKOMMENSGRENZEN[clampedPersonen] ?? 43_320;

  const jahreseinkommenNetto = input.zu_versteuerndes_einkommen_eur
    ? Math.round(input.zu_versteuerndes_einkommen_eur * 0.7)  // grobe Näherung
    : 0;

  const beduerftig = input.zu_versteuerndes_einkommen_eur
    ? jahreseinkommenNetto <= einkommensgrenze
    : true; // Unbekanntes Einkommen → möglicherweise berechtigt

  const wohngeldbasis = satz.grundbetrag;
  const wohngeldMitKlima = Math.round(wohngeldbasis * (1 + KLIMAKOMPONENTE));

  // Heizkosten-Komponente (seit 2023, pauschal ~1,20 €/m² × angenommene 60 m²)
  const heizPauschale = haushaltspersonen <= 2 ? 45 : haushaltspersonen <= 4 ? 75 : 100;

  const wohngeldGesamt = wohngeldMitKlima + heizPauschale;

  ansprueche.push({
    id: "wogg_wohngeld",
    titel: "Wohngeld",
    rechtsgrundlage: "§§ 1–33 WoGG",
    beschreibung: `Mietzuschuss für Haushalte mit geringem Einkommen. Seit 2023: Wohngeld-Plus mit Klimakomponente (+7,5 %) und Heizkostenzuschuss. Für ${haushaltspersonen}-Personen-Haushalt.`,
    betrag_monatlich_eur: beduerftig ? wohngeldGesamt : 0,
    betrag_hinweis: beduerftig
      ? `Schätzung für ${haushaltspersonen}-Personen-Haushalt: ~${wohngeldGesamt} €/Monat inkl. Klimakomponente und Heizkosten-Anteil. Exakter Betrag von der Wohngeldbehörde berechnet.`
      : `Jahreseinkommen (${jahreseinkommenNetto.toLocaleString("de-DE")} € netto) übersteigt Einkommensgrenze für ${haushaltspersonen} Personen (${einkommensgrenze.toLocaleString("de-DE")} €).`,
    voraussetzungen_erfuellt: beduerftig,
    voraussetzungen_details: [
      `Haushaltsgröße: ${haushaltspersonen} ${haushaltspersonen === 1 ? "Person" : "Personen"}`,
      `Einkommensgrenze netto: ${einkommensgrenze.toLocaleString("de-DE")} €/Jahr`,
      `Geschätztes Nettoeinkommen: ${jahreseinkommenNetto.toLocaleString("de-DE")} €/Jahr`,
      `Status: ${beduerftig ? "✓ möglicherweise berechtigt" : "✗ Einkommen zu hoch"}`,
      `Max. anrechenbare Miete (Mietenstufe III): ${satz.maxMiete} €/Monat`,
      `Kein gleichzeitiger Bürgergeld-Bezug möglich`,
    ],
    antrag_bei: "Wohngeldbehörde (Wohnungsamt der Gemeinde/Stadt)",
    antrag_hinweis:
      "Antrag beim örtlichen Wohnungsamt oder online (in vielen Bundesländern). Wohngeld und Kinderzuschlag als Paket prüfen lassen.",
    kombinierbar_mit: ["bkgg_kinderzuschlag"],
    nicht_kombinierbar_mit: ["sgb2_buergergeld", "sgb12_grundsicherung"],
    kategorie: "sozialhilfe",
    prioritaet: 2,
  });

  // Lastenzuschuss für Eigentümer
  if (input.wohnform === "privat") {
    ansprueche.push({
      id: "wogg_lastenzuschuss",
      titel: "Wohngeld – Lastenzuschuss (Eigentümer)",
      rechtsgrundlage: "§§ 1 Abs. 2, 11 WoGG",
      beschreibung:
        "Für Eigentümer von selbstgenutztem Wohneigentum statt Mietzuschuss: Lastenzuschuss auf die Belastungen (Hypothek, Instandhaltungskosten).",
      betrag_monatlich_eur: beduerftig ? Math.round(wohngeldGesamt * 0.85) : 0,
      betrag_hinweis: "Berechnung analog zum Mietzuschuss, aber auf Basis der Wohnkosten als Eigentümer.",
      voraussetzungen_erfuellt: beduerftig,
      voraussetzungen_details: [
        "Selbstgenutztes Wohneigentum: ✓ (Eigenheim / Eigentumswohnung)",
        "Einkommensgrenzen wie beim Mietzuschuss",
      ],
      antrag_bei: "Wohngeldbehörde",
      kategorie: "sozialhilfe",
      prioritaet: 3,
    });
  }

  return ansprueche;
}

// ============================================
// BEEG – Elterngeld + Elterngeld Plus + Partnerschaftsbonus
// Stand: 2025 (BEEG in der Fassung des Elterngeld-Digitalisierungsgesetzes)
//
// COMPLIANCE: Deterministisch, kein LLM (FB-31, FB-125)
// ============================================

import type { AnspruchsInput, Anspruch } from "./types";

// ── Elterngeld-Parameter 2025 ─────────────────────────────────────────────
const ELTERNGELD_MIN = 300;          // € Mindestbetrag/Monat
const ELTERNGELD_MAX = 1800;         // € Höchstbetrag/Monat (ab 1.4.2024)
const ELTERNGELD_PLUS_MIN = 150;     // Halber Mindestbetrag
const ELTERNGELD_PLUS_MAX = 900;     // Halber Höchstbetrag
const EINKOMMENSERSATZQUOTE = 0.65;  // 65% des Nettoeinkommens (Basis)
const EINKOMMENSERSATZQUOTE_NIEDRIG = 0.67; // 67% bei Einkommen < 1.000 €/Monat
const GESCHWISTERBONUS = 0.10;       // +10% bei Geschwistern unter 3 / 6 Jahren
const MEHRLINGS_BONUS = 300;         // € je weiterem Mehrlingskind

// ── Bezugsdauer ────────────────────────────────────────────────────────────
const BASISELTERNGELD_MONATE = 12;   // Basis: 12 Monate (+ 2 Partnermonate)
const ELTERNGELD_PLUS_MONATE = 24;   // ElterngeldPlus: doppelt so lang

// ── Einkommensgrenze 2024 (Wegfall des Elterngeldes) ─────────────────────
const EINKOMMENSGRENZE_ALLEIN = 200_000;  // € zvE/Jahr (ab 1.4.2024)
const EINKOMMENSGRENZE_PAAR   = 200_000; // € zvE/Jahr für Paare

export function berechneBeeg(input: AnspruchsInput): Anspruch[] {
  const ansprueche: Anspruch[] = [];

  // Elterngeld ist nur bei Geburt/früher Kindheit relevant
  if (
    input.lebenslage !== "geburt_fruehe_kindheit" &&
    input.lebenslage !== "erwerbsleben_vereinbarkeit"
  ) {
    return ansprueche;
  }

  // Prüfen ob Säugling/Kleinkind im Haushalt
  const hatSaeugling = input.kinder?.some((k) => k.alter <= 1) ?? false;
  const hatKleinkind = input.kinder?.some((k) => k.alter <= 2) ?? false;
  if (!hatSaeugling && input.lebenslage !== "geburt_fruehe_kindheit") {
    return ansprueche;
  }

  const istVerheiratet =
    input.familienstand === "verheiratet" || input.familienstand === "eingetragen";
  const zvE = input.zu_versteuerndes_einkommen_eur ?? 0;
  const einkommensgrenze = istVerheiratet ? EINKOMMENSGRENZE_PAAR : EINKOMMENSGRENZE_ALLEIN;

  // Einkommensgrenze überschritten → kein Elterngeld ab 1.4.2024
  const berechtigt = zvE <= einkommensgrenze;

  // Elterngeld-Berechnung (vereinfacht: auf Basis Vorjahreseinkommen)
  const monatlichesNetto = Math.round(zvE / 12 * 0.68); // Näherung: ~68% Steuer+SV
  const basisQuote =
    monatlichesNetto < 1000 ? EINKOMMENSERSATZQUOTE_NIEDRIG : EINKOMMENSERSATZQUOTE;

  // Elterngeld beim betreuenden Elternteil (Einkommensausfall)
  const elterngeldBrutto = Math.min(
    Math.max(Math.round(monatlichesNetto * basisQuote), ELTERNGELD_MIN),
    ELTERNGELD_MAX
  );

  // Geschwisterbonus?
  const geschwisterBonus = pruefeGeschwisterbonus(input);
  const elterngeldMitBonus = geschwisterBonus
    ? Math.min(elterngeldBrutto * (1 + GESCHWISTERBONUS), ELTERNGELD_MAX)
    : elterngeldBrutto;

  // ── 1. Basiselterngeld ─────────────────────────────────────────────────
  ansprueche.push({
    id: "beeg_elterngeld",
    titel: "Basiselterngeld",
    rechtsgrundlage: "§§ 1–7 BEEG",
    beschreibung: `Elterngeld ersetzt ${Math.round(basisQuote * 100)} % des wegfallenden Nettoeinkommens für bis zu 12 Monate (14 Monate mit Partnermonaten). Mindestbetrag ${ELTERNGELD_MIN} €, Höchstbetrag ${ELTERNGELD_MAX} €/Monat.`,
    betrag_monatlich_eur: berechtigt ? Math.round(elterngeldMitBonus) : 0,
    betrag_jaehrlich_eur: berechtigt ? Math.round(elterngeldMitBonus) * BASISELTERNGELD_MONATE : 0,
    betrag_hinweis: berechtigt
      ? `Schätzung: ${Math.round(elterngeldMitBonus)} €/Monat × ${BASISELTERNGELD_MONATE} Monate (+ 2 Partnermonate möglich). Exakter Betrag vom Elterngeld-Amt berechnet.`
      : `Kein Anspruch: Jahreseinkommen übersteigt ${einkommensgrenze.toLocaleString("de-DE")} € (ab 1.4.2024).`,
    voraussetzungen_erfuellt: berechtigt,
    voraussetzungen_details: [
      `Kind unter 14 Monaten: ${hatSaeugling ? "✓" : "ggf. – Prüfung nötig"}`,
      `Einkommen unter Grenze (${einkommensgrenze.toLocaleString("de-DE")} €): ${berechtigt ? "✓" : "✗"}`,
      `Aufenthalt in Deutschland: vorausgesetzt`,
      `Betreuung übernommen (Stundenreduktion): vorausgesetzt`,
      geschwisterBonus ? `Geschwisterbonus: +10 % ✓` : `Kein Geschwisterbonus`,
    ],
    antrag_bei: "Elterngeldstelle (Landesbehörde – zuständig nach Wohnort)",
    antrag_hinweis:
      "Antrag rückwirkend bis zu 3 Monate möglich. Frühzeitig stellen – Auszahlung ab 1. Lebensmonat.",
    kombinierbar_mit: ["beeg_elterngeld_plus", "bkgg_kinderzuschlag"],
    kategorie: "jugendhilfe",
    prioritaet: 1,
  });

  // ── 2. ElterngeldPlus ─────────────────────────────────────────────────
  if (berechtigt) {
    const egPlus = Math.min(
      Math.max(Math.round(elterngeldMitBonus / 2), ELTERNGELD_PLUS_MIN),
      ELTERNGELD_PLUS_MAX
    );

    ansprueche.push({
      id: "beeg_elterngeld_plus",
      titel: "ElterngeldPlus",
      rechtsgrundlage: "§ 4 Abs. 3 BEEG",
      beschreibung: `ElterngeldPlus verlängert den Bezug auf bis zu 24 Monate bei halbem Betrag (max. ${ELTERNGELD_PLUS_MAX} €/Monat). Ideal bei Teilzeitarbeit während Elternzeit.`,
      betrag_monatlich_eur: egPlus,
      betrag_jaehrlich_eur: egPlus * ELTERNGELD_PLUS_MONATE,
      betrag_hinweis: `${egPlus} €/Monat × bis zu 24 Monate = ${egPlus * 24} € gesamt.`,
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        "Wahlrecht: statt Basiselterngeld oder zusätzlich bei Teilzeit",
        "Teilzeitarbeit (10–32h/Woche) empfohlen für maximale Nutzung",
        `Betrag: ${egPlus} €/Monat (Hälfte des Basiselterngeldes)`,
      ],
      antrag_bei: "Elterngeldstelle",
      antrag_hinweis: "Im selben Antrag wie Basiselterngeld wählen. Kombination möglich.",
      kombinierbar_mit: ["beeg_partnerschaftsbonus"],
      kategorie: "jugendhilfe",
      prioritaet: 2,
    });

    // ── 3. Partnerschaftsbonus (§ 4 Abs. 4 BEEG) ─────────────────────
    if (istVerheiratet) {
      ansprueche.push({
        id: "beeg_partnerschaftsbonus",
        titel: "Partnerschaftsbonus",
        rechtsgrundlage: "§ 4 Abs. 4 BEEG",
        beschreibung:
          "4 zusätzliche ElterngeldPlus-Monate, wenn beide Elternteile gleichzeitig 24–32h/Woche arbeiten (4+4 Partnermonate).",
        betrag_monatlich_eur: egPlus * 2, // beide zusammen
        betrag_hinweis: `Beide Elternteile zusammen: ~${egPlus * 2} €/Monat × 4 Monate = ${egPlus * 2 * 4} €.`,
        voraussetzungen_erfuellt: true,
        voraussetzungen_details: [
          "Beide Elternteile müssen gleichzeitig 24–32h/Woche arbeiten",
          "Gilt für 4 Monate (je Elternteil 4 Monate)",
          "Kombinierbar mit ElterngeldPlus",
        ],
        antrag_bei: "Elterngeldstelle",
        antrag_hinweis: "Mit ElterngeldPlus-Antrag beantragen.",
        kombinierbar_mit: ["beeg_elterngeld_plus"],
        kategorie: "jugendhilfe",
        prioritaet: 3,
      });
    }
  }

  // ── 4. Kindergeld (§§ 62 ff. EStG / § 6 BKGG) ───────────────────────
  const kinderAnzahl = input.kinder?.filter((k) => k.alter < 25).length ?? 0;
  if (kinderAnzahl > 0) {
    const kg1 = 250;  // € pro Kind/Monat (2025)
    const gesamt = kg1 * kinderAnzahl;

    ansprueche.push({
      id: "estg_kindergeld",
      titel: "Kindergeld",
      rechtsgrundlage: "§§ 62–78 EStG / § 6 BKGG",
      beschreibung: `${kg1} € pro Kind und Monat (2025). Für Kinder bis 18 Jahre, bei Ausbildung/Studium bis 25 Jahre.`,
      betrag_monatlich_eur: gesamt,
      betrag_jaehrlich_eur: gesamt * 12,
      voraussetzungen_erfuellt: kinderAnzahl > 0,
      voraussetzungen_details: [
        `${kinderAnzahl} ${kinderAnzahl === 1 ? "Kind" : "Kinder"} unter 25 J.: ✓`,
        "Wohnsitz/gewöhnlicher Aufenthalt in Deutschland: vorausgesetzt",
        `Betrag: ${kg1} € × ${kinderAnzahl} ${kinderAnzahl === 1 ? "Kind" : "Kinder"} = ${gesamt} €/Monat`,
      ],
      antrag_bei: "Familienkasse der Bundesagentur für Arbeit",
      antrag_hinweis:
        "Online-Antrag unter familienkasse.de. Rückwirkend max. 6 Monate möglich.",
      kombinierbar_mit: ["bkgg_kinderzuschlag", "beeg_elterngeld"],
      kategorie: "jugendhilfe",
      prioritaet: 1,
    });
  }

  return ansprueche;
}

function pruefeGeschwisterbonus(input: AnspruchsInput): boolean {
  const kinder = input.kinder ?? [];
  // Geschwisterbonus wenn mind. 2 Kinder unter 3 Jahren oder 3 Kinder unter 6 Jahren
  const unter3 = kinder.filter((k) => k.alter < 3).length;
  const unter6 = kinder.filter((k) => k.alter < 6).length;
  return unter3 >= 2 || unter6 >= 3;
}

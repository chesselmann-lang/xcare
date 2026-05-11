// ============================================
// SGB II – Bürgergeld + Kinderzuschlag
// Stand: 2025 (Regelbedarfe nach RBEG 2025)
//
// COMPLIANCE: Deterministisch, kein LLM (FB-31, FB-125)
// Alle Beträge nach geltendem Recht, Stand 2025.
// ============================================

import type { AnspruchsInput, Anspruch } from "./types";

// ── Regelbedarfe 2025 (§ 20 SGB II) ──────────────────────────────────────────
const REGELBEDARF = {
  alleinstehend: 563,          // Regelbedarfsstufe 1
  partner: 506,                 // Regelbedarfsstufe 2 (je Person)
  kind_0_5: 357,               // Regelbedarfsstufe 6
  kind_6_13: 390,              // Regelbedarfsstufe 5
  kind_14_17: 471,             // Regelbedarfsstufe 4
  volljähriges_kind: 451,      // Regelbedarfsstufe 3
} as const;

// ── Kinderzuschlag 2025 (§ 6a BKGG) ─────────────────────────────────────────
const KINDERZUSCHLAG_MAX = 292;  // € pro Kind und Monat (2025)
const KINDERZUSCHLAG_MINDEST_EINKOMMEN_ALLEIN = 600;
const KINDERZUSCHLAG_MINDEST_EINKOMMEN_PAAR = 900;

// ── Mehrbedarf Pflege (§ 21 Abs. 7 SGB II) ────────────────────────────────
const MEHRBEDARF_PFLEGESTUFE_PROZENT = 0.35;  // 35% des maßgeblichen Regelbedarfs

export function berechneSgbII(input: AnspruchsInput): Anspruch[] {
  const ansprueche: Anspruch[] = [];

  // Bürgergeld nur bei Erwerbsfähigkeit (15–65 J.) oder pflegebedürftiger Haushalt
  const lebenslageRelevant =
    input.lebenslage === "erwerbsleben_vereinbarkeit" ||
    input.lebenslage === "alter_pflege" ||
    input.lebenslage === "krankheit_genesung" ||
    input.lebenslage === "geburt_fruehe_kindheit" ||
    input.lebenslage === "schulkind_jugend";

  if (!lebenslageRelevant) return ansprueche;

  const istErwerbsfaehig = input.alter >= 15 && input.alter < 65;
  const hatKinder = (input.kinder?.length ?? 0) > 0;
  const istVerheiratet =
    input.familienstand === "verheiratet" || input.familienstand === "eingetragen";

  // ── 1. Bürgergeld-Grundbedarf ──────────────────────────────────────────────
  if (istErwerbsfaehig && input.zu_versteuerndes_einkommen_eur !== undefined) {
    const monatlichesEinkommenGeschaetzt = Math.round(
      input.zu_versteuerndes_einkommen_eur / 12
    );
    const grundbedarf = istVerheiratet
      ? REGELBEDARF.partner * 2
      : REGELBEDARF.alleinstehend;

    // Kindbedarfe addieren
    let kindBedarf = 0;
    for (const kind of input.kinder ?? []) {
      if (kind.alter <= 5) kindBedarf += REGELBEDARF.kind_0_5;
      else if (kind.alter <= 13) kindBedarf += REGELBEDARF.kind_6_13;
      else if (kind.alter <= 17) kindBedarf += REGELBEDARF.kind_14_17;
      else kindBedarf += REGELBEDARF.volljähriges_kind;
    }

    const gesamtBedarf = grundbedarf + kindBedarf;
    const beduerftigPruefen = monatlichesEinkommenGeschaetzt < gesamtBedarf;

    ansprueche.push({
      id: "sgb2_buergergeld",
      titel: "Bürgergeld",
      rechtsgrundlage: "§§ 7, 19, 20 SGB II",
      beschreibung:
        "Grundsicherung für Erwerbsfähige. Sichert den Lebensunterhalt, wenn Einkommen und Vermögen nicht ausreichen. Umfasst Regelbedarf, Mehrbedarf und Kosten der Unterkunft.",
      betrag_monatlich_eur: beduerftigPruefen ? Math.max(0, gesamtBedarf - monatlichesEinkommenGeschaetzt) : 0,
      betrag_hinweis: beduerftigPruefen
        ? `Geschätzter Anspruch auf Basis Regelbedarfe 2025. Exakter Betrag vom Jobcenter berechnet (inkl. Kosten der Unterkunft).`
        : `Auf Basis des angegebenen Einkommens wahrscheinlich kein Anspruch. Jobcenter-Beratung empfohlen.`,
      voraussetzungen_erfuellt: beduerftigPruefen,
      voraussetzungen_details: [
        `Erwerbsfähig (15–65 Jahre): ✓`,
        `Wohnhaft in Deutschland: vorausgesetzt`,
        `Hilfebedürftigkeit: ${beduerftigPruefen ? "indiziert (Einkommen < Regelbedarfe)" : "unklar – exakte Prüfung durch Jobcenter nötig"}`,
        `Vermögensprüfung: nicht in diesem Rechner (Schonvermögen: 40.000 € alleinstehend, 15.000 € je weiterer Person)`,
      ],
      antrag_bei: "Jobcenter (lokale Niederlassung der Bundesagentur für Arbeit)",
      antrag_hinweis: "Online-Antrag unter arbeitsagentur.de oder persönlich im Jobcenter.",
      kategorie: "sozialhilfe",
      prioritaet: 1,
    });
  }

  // ── 2. Kinderzuschlag (§ 6a BKGG) ────────────────────────────────────────
  if (hatKinder && input.zu_versteuerndes_einkommen_eur !== undefined) {
    const monatlichesEinkommen = Math.round(input.zu_versteuerndes_einkommen_eur / 12);
    const mindestEinkommen = istVerheiratet
      ? KINDERZUSCHLAG_MINDEST_EINKOMMEN_PAAR
      : KINDERZUSCHLAG_MINDEST_EINKOMMEN_ALLEIN;

    const kinderAnzahl = input.kinder!.filter((k) => k.alter < 25).length;
    const maxKiz = kinderAnzahl * KINDERZUSCHLAG_MAX;
    const einkommenAusreichend = monatlichesEinkommen >= mindestEinkommen;

    // Vereinfachte Anspruchsprüfung — exakter Betrag durch Familienkasse
    const kizAnspruch = einkommenAusreichend && monatlichesEinkommen < mindestEinkommen + maxKiz + 600;

    ansprueche.push({
      id: "bkgg_kinderzuschlag",
      titel: "Kinderzuschlag (KiZ)",
      rechtsgrundlage: "§ 6a BKGG",
      beschreibung:
        `Bis zu ${KINDERZUSCHLAG_MAX} € pro Kind und Monat für Familien mit kleinen Einkommen. Verhindert, dass Familien wegen der Kinder auf Bürgergeld angewiesen sind.`,
      betrag_monatlich_eur: kizAnspruch ? maxKiz : 0,
      betrag_hinweis: `Maximal ${maxKiz} € für ${kinderAnzahl} ${kinderAnzahl === 1 ? "Kind" : "Kinder"} (${KINDERZUSCHLAG_MAX} € je Kind). Exakter Betrag abhängig vom Einkommen.`,
      voraussetzungen_erfuellt: kizAnspruch,
      voraussetzungen_details: [
        `Kinder unter 25 im Haushalt: ${kinderAnzahl} ✓`,
        `Kindergeld-Bezug: Voraussetzung`,
        `Mindesteinkommen (${istVerheiratet ? "Paar" : "Alleinerziehend"}): ${mindestEinkommen} € — Ihr Einkommen: ~${monatlichesEinkommen} € → ${einkommenAusreichend ? "✓ ausreichend" : "✗ zu niedrig"}`,
        `Kein Bürgergeld-Anspruch trotz KiZ: Wird geprüft`,
      ],
      antrag_bei: "Familienkasse der Bundesagentur für Arbeit",
      antrag_hinweis: "Antrag online unter familienkasse.de oder persönlich. KiZ wird gemeinsam mit Wohngeld (Paket-Antrag) geprüft.",
      kombinierbar_mit: ["wogg_wohngeld"],
      nicht_kombinierbar_mit: ["sgb2_buergergeld"],
      kategorie: "jugendhilfe",
      prioritaet: 1,
    });
  }

  // ── 3. Mehrbedarf bei Pflege (§ 21 Abs. 7 SGB II) ───────────────────────
  if (input.pflegegrad && input.pflegegrad >= 2 && istErwerbsfaehig) {
    const regelbedarf = istVerheiratet ? REGELBEDARF.partner : REGELBEDARF.alleinstehend;
    const mehrbedarf = Math.round(regelbedarf * MEHRBEDARF_PFLEGESTUFE_PROZENT);

    ansprueche.push({
      id: "sgb2_mehrbedarf_pflege",
      titel: "Mehrbedarf Pflege (SGB II)",
      rechtsgrundlage: "§ 21 Abs. 7 SGB II",
      beschreibung:
        `Bei Pflegegrad ${input.pflegegrad} wird im Bürgergeld ein Mehrbedarf von 35 % des Regelbedarfs anerkannt.`,
      betrag_monatlich_eur: mehrbedarf,
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        `Pflegegrad ${input.pflegegrad}: ✓`,
        `Erwerbsfähig (15–65 J.): ✓`,
        `Bürgergeld-Bezug: Voraussetzung`,
        `Mehrbedarf: 35 % von ${regelbedarf} € = ${mehrbedarf} €/Monat`,
      ],
      antrag_bei: "Jobcenter",
      antrag_hinweis: "Wird automatisch beim Bürgergeld-Antrag berücksichtigt, wenn Pflegegrad nachgewiesen wird.",
      kombinierbar_mit: ["sgb2_buergergeld"],
      kategorie: "sozialhilfe",
      prioritaet: 2,
    });
  }

  // ── 4. Bildungs- und Teilhabepaket (§§ 28, 29 SGB II) ───────────────────
  const schulkindImHaushalt = input.kinder?.some((k) => k.alter >= 6 && k.alter <= 17) ?? false;
  if (schulkindImHaushalt && input.lebenslage === "schulkind_jugend") {
    ansprueche.push({
      id: "sgb2_bildungspaket",
      titel: "Bildungs- und Teilhabepaket (BuT)",
      rechtsgrundlage: "§§ 28, 29 SGB II",
      beschreibung:
        "Leistungen für Schulkinder: Schulausflüge, Mittagessen, Lernförderung, Schulbedarf (154,50 € jährlich), Teilhabe am sozialen und kulturellen Leben (15 € monatlich).",
      betrag_monatlich_eur: 15,
      betrag_jaehrlich_eur: 15 * 12 + 154.5,
      betrag_hinweis: "15 €/Monat Teilhabe + 154,50 €/Jahr Schulbedarf + situationsbedingte Leistungen.",
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        "Kind im schulpflichtigen Alter (6–17 Jahre): ✓",
        "Bürgergeld, Wohngeld oder Kinderzuschlag-Bezug: Voraussetzung",
        "Schulbedarf: 154,50 € je Schuljahr (77,25 € zum 1.8., 77,25 € zum 1.2.)",
      ],
      antrag_bei: "Jobcenter oder Sozialamt",
      antrag_hinweis: "Antrag auf BuT-Leistungen beim Jobcenter. Einzelnachweise erforderlich.",
      kategorie: "jugendhilfe",
      prioritaet: 2,
    });
  }

  return ansprueche;
}

// ============================================
// SGB V – Krankengeld, SAPV, Hospizleistungen, Reha
// Stand: 2025
//
// COMPLIANCE: Deterministisch, kein LLM (FB-31, FB-125)
// ============================================

import type { AnspruchsInput, Anspruch } from "./types";

// ── Krankengeld-Parameter 2025 ────────────────────────────────────────────
const KRANKENGELD_QUOTE = 0.70;        // 70 % des Bruttoentgelts
const KRANKENGELD_MAX_QUOTE = 0.90;    // max. 90 % des Nettoentgelts
const KRANKENGELD_MAX_TAGE_PRO_KRANK  = 78 * 5;   // 78 Wochen × 5 Tage
const BEITRAGSBEMESSUNGSGRENZE_TAG = 161.75;        // BMG/Tag 2025 (≈ 4852,50 €/Monat / 30)

// ── Kinderkrankengeld (§ 45 SGB V) ───────────────────────────────────────
const KINDERKRANKENTAGE_PRO_KIND = 15; // je Kind je Elternteil 2025 (normal)
const KINDERKRANKENTAGE_ALLEIN = 30;   // Alleinerziehende je Kind

// ── Pflegepersonen-Krankengeld (§ 44a SGB V) ─────────────────────────────
const PFLEGE_KRANKENGELD_TAGE = 10;   // bei akutem Pflegefall in der Familie

export function berechneSgbV(input: AnspruchsInput): Anspruch[] {
  const ansprueche: Anspruch[] = [];

  // ── 1. Krankengeld (§ 44 SGB V) ──────────────────────────────────────
  if (
    input.lebenslage === "krankheit_genesung" ||
    input.lebenslage === "alter_pflege" ||
    input.versicherungsart === "gkv"
  ) {
    const monatlichBrutto = input.zu_versteuerndes_einkommen_eur
      ? Math.round(input.zu_versteuerndes_einkommen_eur / 12)
      : undefined;

    const tagessatzBrutto = monatlichBrutto
      ? Math.min(monatlichBrutto / 30, BEITRAGSBEMESSUNGSGRENZE_TAG)
      : undefined;

    const krankengeldTag = tagessatzBrutto
      ? Math.round(tagessatzBrutto * KRANKENGELD_QUOTE)
      : undefined;

    const krankengeldMonat = krankengeldTag
      ? Math.round(krankengeldTag * 30)
      : undefined;

    ansprueche.push({
      id: "sgbv_krankengeld",
      titel: "Krankengeld",
      rechtsgrundlage: "§ 44 SGB V",
      beschreibung:
        "70 % des Bruttoentgelts (max. 90 % des Netto), wenn Sie länger als 6 Wochen arbeitsunfähig sind. Wird nach Ende der Entgeltfortzahlung durch den Arbeitgeber von der Krankenkasse gezahlt.",
      betrag_monatlich_eur: krankengeldMonat,
      betrag_hinweis: krankengeldMonat
        ? `Schätzung: ~${krankengeldMonat} €/Monat (70 % von ${monatlichBrutto} € Brutto/Monat). Exakter Betrag von Ihrer Krankenkasse.`
        : "Betrag abhängig vom Bruttoentgelt. Bitte Einkommensangabe ergänzen.",
      voraussetzungen_erfuellt: input.versicherungsart === "gkv",
      voraussetzungen_details: [
        `GKV-Mitglied: ${input.versicherungsart === "gkv" ? "✓" : "✗ – PKV/Beihilfe hat eigene Regelungen"}`,
        "Arbeitsunfähigkeit > 6 Wochen: Voraussetzung (Entgeltfortzahlung endet nach 6 Wochen)",
        `Max. Bezugsdauer: ${KRANKENGELD_MAX_TAGE_PRO_KRANK / 5} Wochen je Erkrankung innerhalb von 3 Jahren`,
        "Krankengeldanspruch: nur bei pflichtversicherten Mitgliedern (nicht bei freiwillig versicherten Selbstständigen ohne Opt-in)",
      ],
      antrag_bei: "Krankenkkasse (Formular: AU-Bescheinigung + Krankengeld-Antrag)",
      antrag_hinweis:
        "Spätestens 7 Tage nach Ablauf der Lohnfortzahlung bei der Krankenkasse melden.",
      kategorie: "pflegeversicherung",
      prioritaet: 1,
    });
  }

  // ── 2. Kinderkrankengeld (§ 45 SGB V) ────────────────────────────────
  const hatKindUnter12 = input.kinder?.some((k) => k.alter < 12) ?? false;
  if (hatKindUnter12 && input.versicherungsart === "gkv") {
    const istAllein =
      input.familienstand === "ledig" ||
      input.familienstand === "geschieden" ||
      input.familienstand === "verwitwet";
    const kinderUnter12 = input.kinder!.filter((k) => k.alter < 12).length;
    const tageProKind = istAllein ? KINDERKRANKENTAGE_ALLEIN : KINDERKRANKENTAGE_PRO_KIND;
    const gesamtTage = Math.min(tageProKind * kinderUnter12, istAllein ? 65 : 35);

    const kindKgTag = input.zu_versteuerndes_einkommen_eur
      ? Math.round(Math.min(input.zu_versteuerndes_einkommen_eur / 12 / 30, BEITRAGSBEMESSUNGSGRENZE_TAG) * KRANKENGELD_QUOTE)
      : undefined;

    ansprueche.push({
      id: "sgbv_kinderkrankengeld",
      titel: "Kinderkrankengeld",
      rechtsgrundlage: "§ 45 SGB V",
      beschreibung: `${tageProKind} Tage je Kind und Elternteil (${istAllein ? "Alleinerziehend: " + KINDERKRANKENTAGE_ALLEIN : KINDERKRANKENTAGE_PRO_KIND} Tage/Kind) bei Erkrankung eines Kindes unter 12 Jahren.`,
      betrag_monatlich_eur: kindKgTag ? kindKgTag * 30 : undefined,
      betrag_hinweis: kindKgTag
        ? `~${kindKgTag} €/Tag × max. ${gesamtTage} Tage/Jahr = ${kindKgTag * gesamtTage} €/Jahr.`
        : `Betrag ~70 % Ihres Nettotageslohns. Je ${kinderUnter12} ${kinderUnter12 === 1 ? "Kind" : "Kinder"} insgesamt ${gesamtTage} Tage/Jahr.`,
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        `Kind unter 12 Jahren: ${kinderUnter12} ✓`,
        "GKV-Mitgliedschaft: ✓",
        `Tage je Kind: ${tageProKind} (${istAllein ? "Alleinerziehend" : "mit Partner"})`,
        `Gesamt-Max: ${gesamtTage} Tage/Jahr`,
        "Kind muss selbst GKV-versichert sein",
      ],
      antrag_bei: "Krankenkasse",
      antrag_hinweis: "Ärztliche Bescheinigung der Erkrankung des Kindes einreichen.",
      kategorie: "pflegeversicherung",
      prioritaet: 2,
    });
  }

  // ── 3. Häusliche Krankenpflege (§ 37 SGB V) ──────────────────────────
  if (
    (input.lebenslage === "krankheit_genesung" || input.lebenslage === "alter_pflege") &&
    input.wohnform !== "heim"
  ) {
    ansprueche.push({
      id: "sgbv_haeusliche_krankenpflege",
      titel: "Häusliche Krankenpflege",
      rechtsgrundlage: "§ 37 SGB V",
      beschreibung:
        "Behandlungspflege (Verbandswechsel, Medikamentengabe, Injektionen) und Grundpflege durch ambulante Pflegedienste, wenn Krankenhausaufenthalt vermieden werden kann.",
      betrag_hinweis:
        "Leistungserbringung durch Pflegedienst, keine Geldleistung. Zuzahlung: 10 % der Kosten, mind. 5 €, max. 10 € pro Verordnung.",
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        "Ärztliche Verordnung erforderlich (Formular 12 / Rezept für Behandlungspflege)",
        "GKV-Mitgliedschaft",
        "Häusliche Versorgung (kein Heim-Aufenthalt)",
        "Dauer: 4 Wochen pro Verordnung, verlängerbar",
      ],
      antrag_bei: "Krankenkasse (über ärztliche Verordnung)",
      antrag_hinweis: "Arzt stellt Verordnung aus, Krankenkasse genehmigt, Pflegedienst erbringt Leistung.",
      kombinierbar_mit: ["sgb11_pflegegeld", "sgb11_sachleistungen"],
      kategorie: "pflegeversicherung",
      prioritaet: 2,
    });
  }

  // ── 4. SAPV / Hospizversorgung (§ 37b und § 39a SGB V) ───────────────
  if (
    input.lebenslage === "hospiz_palliativ" ||
    (input.lebenslage === "alter_pflege" && (input.pflegegrad ?? 0) >= 4)
  ) {
    ansprueche.push({
      id: "sgbv_sapv",
      titel: "Spezialisierte Ambulante Palliativversorgung (SAPV)",
      rechtsgrundlage: "§ 37b SGB V",
      beschreibung:
        "Vollständige palliativmedizinische und -pflegerische Versorgung zu Hause oder in stationären Hospizen. SAPV-Teams kommen rund um die Uhr in die häusliche Umgebung.",
      betrag_hinweis: "Volle GKV-Kostenübernahme ohne Zuzahlung. Keine Geldleistung.",
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        "Unheilbare, fortschreitende Erkrankung mit begrenzter Lebenserwartung",
        "Besonders aufwändige Versorgung notwendig (Schmerz, Symptomkontrolle)",
        "Verordnung durch Arzt (Formular 63)",
        "GKV-Mitgliedschaft",
      ],
      antrag_bei: "Hausarzt / Facharzt (Verordnung) → Krankenkasse genehmigt",
      antrag_hinweis:
        "Antrag bei der Krankenkasse gemeinsam mit ärztlicher Verordnung. SAPV-Team des Landkreises wird koordiniert.",
      kategorie: "pflegeversicherung",
      prioritaet: 1,
    });

    ansprueche.push({
      id: "sgbv_hospiz",
      titel: "Stationäre Hospizversorgung",
      rechtsgrundlage: "§ 39a SGB V",
      beschreibung:
        "GKV übernimmt mind. 95 % der Kosten für stationäre Hospize. Eigenanteil durch das Hospiz selbst und Pflegeversicherung gedeckt.",
      betrag_monatlich_eur: 0,
      betrag_hinweis: "Kostenübernahme durch GKV (≥95 %). Pflegekasse zahlt bis zu 266 €/Tag. Eigenanteil nahezu 0.",
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        "Sterbeprozess hat eingesetzt oder begrenzte Lebenserwartung",
        "Häusliche oder teilstationäre Versorgung nicht möglich/zumutbar",
        "GKV + Pflegeversicherungsmitgliedschaft",
      ],
      antrag_bei: "Krankenkasse + Pflegekasse (parallel)",
      antrag_hinweis: "Krankenkasse und Hospiz koordinieren. Vorab Platz im Hospiz anfragen.",
      kombinierbar_mit: ["sgb11_pflegegeld"],
      kategorie: "pflegeversicherung",
      prioritaet: 1,
    });
  }

  // ── 5. Vorsorge-/Rehabilitationsleistungen (§§ 23, 40 SGB V) ─────────
  if (input.lebenslage === "krankheit_genesung") {
    ansprueche.push({
      id: "sgbv_reha",
      titel: "Medizinische Rehabilitation (Reha)",
      rechtsgrundlage: "§§ 27, 40 SGB V / § 9 SGB VI",
      beschreibung:
        "Stationäre oder ambulante Reha nach Krankenhausaufenthalt oder bei chronischer Erkrankung. GKV: medizinische Reha. DRV: Erwerbsfähigkeits-Reha.",
      betrag_hinweis:
        "Kostenübernahme durch Krankenkasse oder Rentenversicherung. Zuzahlung: 10 €/Tag (max. 42 Tage/Jahr, befreiungsfähig).",
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        "Ärztliche Indikation: Rehafähigkeit und Rehabedürftigkeit",
        "Antragstellung 6–8 Wochen vor Reha-Beginn empfohlen",
        "Reha-Klinik-Wahl: Versicherte können Wunsch-Klinik benennen",
        "Anschlussheilbehandlung (AHB): direkt nach Krankenhausaufenthalt, innerhalb von 14 Tagen beginnen",
      ],
      antrag_bei: "Krankenkasse oder Deutsche Rentenversicherung (je nach Indikation)",
      antrag_hinweis:
        "Formular: Antrag auf Leistungen zur med. Rehabilitation (G0200 / G0220). Arzt füllt Befundbericht aus.",
      kategorie: "pflegeversicherung",
      prioritaet: 2,
    });
  }

  return ansprueche;
}

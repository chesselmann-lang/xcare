// ============================================
// SGB XII – Sozialhilfe / Grundsicherung
// Stand: 2025
// Quellen: §§ 19, 27, 41, 61-66 SGB XII
// ============================================

import type { AnspruchsInput, Anspruch } from "./types";

// Regelsätze 2025 (Regelbedarfsstufen nach RBEG)
const REGELSATZ_ALLEINSTEHEND = 563;        // Stufe 1
const REGELSATZ_PAARE_JE_PERSON = 506;      // Stufe 2 (90% des Eckregelsatzes)
const REGELSATZ_KIND_BIS_5 = 357;
const REGELSATZ_KIND_6_13 = 390;
const REGELSATZ_KIND_14_17 = 471;
const REGELSATZ_KIND_AB_18 = 451;           // im Haushalt lebend

// Grundfreibetrag für Ersparnisse / Schonvermögen
const SCHONVERMOEGEN_ALLEINSTEHEND = 5000;
const SCHONVERMOEGEN_PAAR = 10000;

export function berechneSgbXII(input: AnspruchsInput): Anspruch[] {
  const ansprueche: Anspruch[] = [];
  const { alter, familienstand, zu_versteuerndes_einkommen_eur, pflegegrad } = input;

  // 1. Grundsicherung im Alter (§§ 41-46b SGB XII) – für Personen ab 67 Jahre
  if (alter >= 67) {
    const einkommensgrenze = familienstand === "verheiratet"
      ? REGELSATZ_PAARE_JE_PERSON
      : REGELSATZ_ALLEINSTEHEND;

    const einkommenNiedrig =
      !zu_versteuerndes_einkommen_eur ||
      zu_versteuerndes_einkommen_eur / 12 < einkommensgrenze * 1.5;

    ansprueche.push({
      id: "sgb-xii-grundsicherung-alter",
      titel: "Grundsicherung im Alter",
      rechtsgrundlage: "§§ 41–46b SGB XII",
      beschreibung:
        "Steuerfinanzierte Grundsicherung für Personen ab 67 Jahren (Regelaltersgrenze), die die Grundsicherung im Alter nicht aus eigenem Einkommen/Vermögen decken können. Kein Rückgriff auf Kinder (außer Einkommen > 100.000 €/Jahr).",
      betrag_hinweis:
        einkommenNiedrig
          ? `Mögliche Leistung: Aufstockung bis Regelsatz (${familienstand === "verheiratet" ? REGELSATZ_PAARE_JE_PERSON : REGELSATZ_ALLEINSTEHEND} €/Monat) + Unterkunftskosten + Pflegebedarf. Individuelle Prüfung beim Sozialamt erforderlich.`
          : "Einkommensabhängig – Prüfung beim zuständigen Sozialamt empfohlen.",
      voraussetzungen_erfuellt: einkommenNiedrig,
      voraussetzungen_details: [
        "Vollendetes 67. Lebensjahr ODER dauerhaft volle Erwerbsminderung",
        "Wohnsitz in Deutschland, deutsche Staatsangehörigkeit oder EU-BürgerIn",
        "Einkommen unter Bedarf (Regelsatz + Unterkunftskosten + Pflegebedarf)",
        `Schonvermögen: bis ${familienstand === "verheiratet" ? SCHONVERMOEGEN_PAAR : SCHONVERMOEGEN_ALLEINSTEHEND} € bleiben anrechnungsfrei`,
        "Kinder haften NICHT – kein Unterhaltsrückgriff (§ 43 Abs. 5 SGB XII)",
      ],
      antrag_bei: "Sozialamt der Wohngemeinde",
      antrag_hinweis:
        "Antrag SOFORT stellen – Leistung gilt ab Antragsmonat (kein rückwirkender Anspruch). VdK / Sozialverbände helfen bei der Antragstellung kostenlos.",
      kategorie: "sozialhilfe",
      prioritaet: 1,
    });
  }

  // 2. Hilfe zur Pflege (§§ 61-66 SGB XII) – nachrangig zu SGB XI
  if (pflegegrad && pflegegrad >= 1) {
    ansprueche.push({
      id: "sgb-xii-hilfe-zur-pflege",
      titel: "Hilfe zur Pflege (Sozialhilfe)",
      rechtsgrundlage: "§§ 61–66 SGB XII",
      beschreibung:
        "Wenn die Leistungen der Pflegeversicherung nicht ausreichen und eigene Mittel / Unterhaltspflicht nicht ausreichen: Das Sozialamt übernimmt ungedeckte Pflegekosten. Nachrangig zu SGB XI — erst nach Ausschöpfung aller Pflegeversicherungsleistungen.",
      betrag_hinweis:
        "Individuell je nach Pflegeaufwand und ungedeckten Kosten nach SGB XI-Abzug. Eigenbeteiligung aus Einkommen/Vermögen (Schonvermögen bleibt). Unterhaltsrückgriff auf Kinder NUR wenn deren Einkommen > 100.000 €/Jahr.",
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        `Pflegegrad ${pflegegrad} anerkannt`,
        "SGB XI-Leistungen ausgeschöpft",
        "Eigenes Einkommen/Vermögen reicht nicht",
        "Pflegebedarf ist nicht durch Angehörige zumutbar erbringbar",
      ],
      antrag_bei: "Sozialamt der Wohngemeinde",
      antrag_hinweis:
        "Wichtig: Antrag VOR Heimeinzug oder Pflegedienststart stellen. Bei stationärer Pflege übernimmt das Sozialamt den einrichtungseinheitlichen Eigenanteil (EEE) sowie Unterkunft/Verpflegung, wenn eigene Mittel fehlen.",
      kategorie: "sozialhilfe",
      prioritaet: 1,
    });
  }

  // 3. Bildungs- und Teilhabe-Paket (§ 34 SGB XII) – für Kinder in Familien mit SGB XII
  if (input.kinder && input.kinder.length > 0) {
    const schulkinder = input.kinder.filter((k) => k.alter >= 6 && k.alter <= 18);
    if (schulkinder.length > 0) {
      ansprueche.push({
        id: "sgb-xii-bildungspaket",
        titel: "Bildungs- und Teilhabepaket",
        rechtsgrundlage: "§ 34 SGB XII",
        beschreibung:
          "Leistungen für Schulkinder in SGB XII-Bedarfsgemeinschaften: Schulbedarf (116 €/Schuljahr), Schulausflüge, Mittagessen, Lernförderung, Vereinsmitgliedschaft (15 €/Monat).",
        betrag_monatlich_eur: 15,
        betrag_hinweis: "116 €/Jahr Schulbedarf + 15 €/Monat Soziale Teilhabe + Mittagessen",
        voraussetzungen_erfuellt: true,
        voraussetzungen_details: [
          "Kind zwischen 6 und 18 Jahren",
          "Familie bezieht Grundsicherung (SGB XII) oder Bürgergeld (SGB II)",
        ],
        antrag_bei: "Sozialamt / Jobcenter",
        kategorie: "sozialhilfe",
        prioritaet: 3,
      });
    }
  }

  // 4. Blindenhilfe / Gehörlosenhilfe (§ 72 SGB XII)
  if (input.merkzeichen?.includes("Bl")) {
    ansprueche.push({
      id: "sgb-xii-blindenhilfe",
      titel: "Blindenhilfe",
      rechtsgrundlage: "§ 72 SGB XII",
      beschreibung:
        "Monatlich 77 € Blindenhilfe nach SGB XII (Bundesleistung). Zusätzlich: Landesblindengeld je nach Bundesland (Bayern: 641 €/Monat, NRW: 243 €/Monat etc.). Nicht anrechenbar auf Grundsicherung.",
      betrag_monatlich_eur: 77,
      betrag_hinweis: "77 €/Monat Bundesleistung + Landesblindengeld variiert stark je Bundesland",
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        "Merkzeichen 'Bl' im Schwerbehindertenausweis",
        "Wohnsitz in Deutschland",
      ],
      antrag_bei: "Sozialamt",
      kategorie: "sozialhilfe",
      prioritaet: 2,
    });
  }

  return ansprueche;
}

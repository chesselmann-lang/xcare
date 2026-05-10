// ============================================
// SGB VIII – Kinder- und Jugendhilfe
// SGB IX – Rehabilitation & Teilhabe
// Stand: 2025
// ============================================

import type { AnspruchsInput, Anspruch } from "./types";

// ---------- SGB VIII ----------

export function berechneSgbVIII(input: AnspruchsInput): Anspruch[] {
  const ansprueche: Anspruch[] = [];
  const { kinder } = input;

  if (!kinder || kinder.length === 0) return ansprueche;

  for (const kind of kinder) {
    // 1. Rechtsanspruch auf Kita-Platz (§ 24 SGB VIII) – ab 1 Jahr
    if (kind.alter >= 1 && kind.alter < 6 && !kind.in_kita) {
      ansprueche.push({
        id: `sgb-viii-kita-anspruch-${kind.alter}`,
        titel: `KiTa-Anspruch (Kind, ${kind.alter} Jahre)`,
        rechtsgrundlage: "§ 24 Abs. 2 SGB VIII",
        beschreibung:
          "Rechtsanspruch auf einen Kindergartenplatz ab vollendetem 1. Lebensjahr bis Schuleintritt. Bei Nichterfüllung: Schadensersatz (§ 839 BGB i.V.m. Art. 34 GG) vom Landkreis/der Stadt möglich.",
        betrag_hinweis:
          "Kein direkter Geldbetrag – Sachleistung (Betreuungsplatz). Kosten träger-abhängig. Elternbeiträge einkommensabhängig. In vielen Bundesländern beitragsfrei ab 3 Jahren.",
        voraussetzungen_erfuellt: true,
        voraussetzungen_details: [
          `Kind ist ${kind.alter} Jahre alt (Anspruch ab 1 Jahr)`,
          "Wohnsitz in Deutschland",
          "Anspruch besteht unabhängig von Erwerbstätigkeit der Eltern",
        ],
        antrag_bei: "Zuständiges Jugendamt",
        antrag_hinweis:
          "Anmeldung möglichst früh (ab Geburt) auf Wartelisten. Bei Ablehnung: Widerspruch + ggf. Eilantrag Verwaltungsgericht. Tagespflege als Alternative anerkannt.",
        kategorie: "jugendhilfe",
        prioritaet: 1,
      });
    }

    // 2. Tagespflege (§ 23 SGB VIII) – Tageseltern als Alternative
    if (kind.alter >= 0 && kind.alter < 3 && !kind.in_kita && !kind.in_tagespflege) {
      ansprueche.push({
        id: `sgb-viii-tagespflege-${kind.alter}`,
        titel: `Kindertagespflege (Kind, ${kind.alter} Jahre)`,
        rechtsgrundlage: "§ 23 SGB VIII",
        beschreibung:
          "Kindertagespflege (Tageseltern) als gleichwertige Alternative zur Kita. Jugendamt übernimmt Beitrag anteilig je nach Einkommen. Tageseltern werden vom Jugendamt vermittelt und qualifiziert.",
        betrag_hinweis:
          "Elternbeiträge einkommensabhängig, oft günstiger als Kita. Jugendamt zahlt laufende Geldleistung direkt an Tagespflegeperson.",
        voraussetzungen_erfuellt: true,
        voraussetzungen_details: [
          `Kind unter 3 Jahren`,
          "Angemessenes Betreuungsangebot in Kitas nicht verfügbar",
        ],
        antrag_bei: "Jugendamt",
        kategorie: "jugendhilfe",
        prioritaet: 2,
      });
    }

    // 3. Behindertes Kind – Eingliederungshilfe nach SGB IX (ab 2020 aus SGB VIII ausgelagert)
    if (kind.behinderung || kind.pflegebedarf) {
      ansprueche.push({
        id: `sgb-viii-ix-kind-eingliederung-${kind.alter}`,
        titel: `Eingliederungshilfe für behindertes Kind (${kind.alter} Jahre)`,
        rechtsgrundlage: "§§ 99ff SGB IX (für Kinder unter 18: § 35a SGB VIII)",
        beschreibung:
          "Kinder mit seelischer Behinderung: § 35a SGB VIII (Jugendamt). Kinder mit körperlicher/geistiger Behinderung: SGB IX (Eingliederungshilfeträger). Umfasst Frühförderung, Schulbegleitung, Hilfsmittel, soziale Teilhabe.",
        betrag_hinweis:
          "Individuell nach Hilfebedarf. Kann Frühförderung (bis Schuleintritt), Schulbegleitung (Integrationshelfer) und Freizeitassistenz umfassen.",
        voraussetzungen_erfuellt: true,
        voraussetzungen_details: [
          "Festgestellte oder drohende Behinderung",
          "Entwicklungsgefährdung",
        ],
        antrag_bei: "Jugendamt (seelische Behinderung) oder Eingliederungshilfeträger (körperl./geistig)",
        antrag_hinweis:
          "Frühzeitige Diagnose und Antrag entscheidend. Frühförderstellen oft direkt zu kontaktieren. Sozialberatung bei VdK oder Caritas.",
        kategorie: "eingliederungshilfe",
        prioritaet: 1,
      });
    }

    // 4. Unterhaltsvorschuss (§ 1 UVG) – Alleinerziehende
    if (
      input.familienstand === "ledig" ||
      input.familienstand === "geschieden" ||
      input.familienstand === "verwitwet"
    ) {
      const uvgBetrag = berechneUVG(kind.alter);
      if (uvgBetrag > 0) {
        ansprueche.push({
          id: `uvg-${kind.alter}`,
          titel: `Unterhaltsvorschuss (Kind, ${kind.alter} Jahre)`,
          rechtsgrundlage: "§ 1 Unterhaltsvorschussgesetz (UVG)",
          beschreibung:
            "Für alleinerziehende Elternteile: staatliche Vorauszahlung von Unterhalt wenn der andere Elternteil keinen oder zu wenig Unterhalt zahlt. Kein Rückzahlungsrisiko für das Kind.",
          betrag_monatlich_eur: uvgBetrag,
          betrag_jaehrlich_eur: uvgBetrag * 12,
          voraussetzungen_erfuellt: true,
          voraussetzungen_details: [
            `Kind unter ${kind.alter < 12 ? "12" : "18"} Jahren`,
            "Alleinerziehend (nicht verheiratet, oder getrennt lebend)",
            "Anderer Elternteil zahlt keinen oder zu wenig Unterhalt",
            "Kind lebt nicht beim unterhaltspflichtigen Elternteil",
          ],
          antrag_bei: "Jugendamt",
          antrag_hinweis:
            "Antrag sofort stellen! Keine rückwirkende Zahlung. Ab 12 Jahren nur bei eigener Bedarfsdeckung durch Bürgergeld prüfen.",
          kategorie: "jugendhilfe",
          prioritaet: 1,
        });
      }
    }
  }

  return ansprueche;
}

function berechneUVG(alter: number): number {
  if (alter < 6) return 230;      // 2025
  if (alter < 12) return 301;
  if (alter < 18) return 395;
  return 0;
}

// ---------- SGB IX – Eingliederungshilfe ----------

export function berechneSgbIX(input: AnspruchsInput): Anspruch[] {
  const ansprueche: Anspruch[] = [];
  const { gdb, merkzeichen, pflegegrad } = input;

  if (!gdb || gdb < 20) return ansprueche;

  // 1. Schwerbehindertenausweis-Vorteile (ab GdB 50)
  if (gdb >= 50) {
    ansprueche.push({
      id: "sgb-ix-schwerbehinderung",
      titel: "Schwerbehindertenausweis – Vergünstigungen",
      rechtsgrundlage: "§§ 2, 152 SGB IX",
      beschreibung:
        "Ab GdB 50 gelten als schwerbehindert: Zusatzurlaub (5 Tage/Jahr), Schutz vor Kündigung, Nachteilsausgleiche im Beruf, steuerlicher Pauschbetrag (384–7.400 € je GdB), ÖPNV-Nutzung mit Beiblatt kostenlos (bei Merkzeichen H, Bl, aG).",
      betrag_hinweis: `Steuerlicher Pauschbetrag: ${berechnePauschbetragGdB(gdb).toLocaleString("de-DE")} €/Jahr. Zusätzlich Vergünstigungen ÖPNV, Freizeiteinrichtungen.`,
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        `GdB ${gdb} anerkannt (ab 50 = Schwerbehindertenstatus)`,
        "Schwerbehindertenausweis beim Versorgungsamt beantragt",
      ],
      antrag_bei: "Versorgungsamt / Amt für Versorgung und Familienförderung",
      antrag_hinweis:
        "Antrag beim zuständigen Versorgungsamt (i.d.R. Landratsamt/Kreisbehörde). Online in vielen Bundesländern möglich.",
      kategorie: "eingliederungshilfe",
      prioritaet: 1,
    });
  }

  // 2. Eingliederungshilfe nach SGB IX (ab 2020) – Teilhabe am Leben in der Gemeinschaft
  if (gdb >= 50) {
    ansprueche.push({
      id: "sgb-ix-eingliederungshilfe",
      titel: "Eingliederungshilfe (SGB IX)",
      rechtsgrundlage: "§§ 90–150 SGB IX",
      beschreibung:
        "Umfassende Leistungen für Menschen mit (drohender) wesentlicher Behinderung: Medizinische Rehabilitation, Teilhabe am Arbeitsleben (WfbM, Budget für Arbeit), Teilhabe an Bildung, Soziale Teilhabe (Persönliche Assistenz, Wohnbegleitung). Keine Vermögensanrechnung mehr ab 2020.",
      betrag_hinweis:
        "Individuell nach Teilhabeplan. Budget für Arbeit: bis 75% des Mindestlohns als Lohnkostenzuschuss. Persönliche Assistenz: bis zur vollen Kostenübernahme.",
      voraussetzungen_erfuellt: gdb >= 50,
      voraussetzungen_details: [
        `GdB ${gdb} anerkannt`,
        "Wesentliche Behinderung (körperlich, geistig oder seelisch)",
        "Einschränkung der gesellschaftlichen Teilhabe",
        "Ab 2020: kein Vermögensvorbehalt außer 150% des Grundfreibetrags (2025: 54.300 €)",
      ],
      antrag_bei: "Eingliederungshilfeträger (je nach Bundesland: Landschaftsverband, Bezirk, Kreis)",
      antrag_hinweis:
        "Gesamtplan-Verfahren (§ 117 SGB IX): Träger erstellt gemeinsam mit Betroffenen einen Gesamtplan. Persönliches Budget möglich (§ 29 SGB IX) — Geld statt Sachleistung.",
      kategorie: "eingliederungshilfe",
      prioritaet: 1,
    });
  }

  // 3. Merkzeichen G/aG – Schwerbehindertenfreifahrt
  if (merkzeichen?.includes("G") || merkzeichen?.includes("aG")) {
    ansprueche.push({
      id: "sgb-ix-oepnv",
      titel: "Freifahrt / ÖPNV-Ermäßigung",
      rechtsgrundlage: "§ 228 SGB IX",
      beschreibung:
        "Mit Merkzeichen G und dem orangefarbenen Beiblatt (jährlich 91 € Eigenanteil): freie Fahrt im ÖPNV bundesweit (Bus, U-Bahn, S-Bahn, Straßenbahn). Mit Merkzeichen H oder Bl: komplett kostenfrei.",
      betrag_hinweis:
        "Einsparung je nach ÖPNV-Nutzung. Beiblatt kostet 91 €/Jahr oder 46 €/Halbjahr (Ausgleichsabgabe). Mit H/Bl: kostenlos.",
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        "Merkzeichen G, aG, H, Bl oder GL im Schwerbehindertenausweis",
        "Oranges Beiblatt beim Versorgungsamt beantragen",
      ],
      antrag_bei: "Versorgungsamt",
      kategorie: "eingliederungshilfe",
      prioritaet: 3,
    });
  }

  // 4. Merkzeichen H – Kostenlose Begleitperson
  if (merkzeichen?.includes("H")) {
    ansprueche.push({
      id: "sgb-ix-begleitperson",
      titel: "Kostenlose Mitnahme einer Begleitperson im ÖPNV",
      rechtsgrundlage: "§ 229 SGB IX",
      beschreibung:
        "Mit Merkzeichen H (Hilflosigkeit): Begleitperson fährt im ÖPNV kostenlos mit. Gilt auch für Kino, Theater, Museen etc. (Eintritt für Begleitperson frei).",
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: ["Merkzeichen H im Schwerbehindertenausweis"],
      antrag_bei: "Versorgungsamt",
      kategorie: "eingliederungshilfe",
      prioritaet: 3,
    });
  }

  // 5. Budget für Arbeit (§ 61 SGB IX)
  if (gdb >= 50 && input.erwerbstaetig === false) {
    ansprueche.push({
      id: "sgb-ix-budget-arbeit",
      titel: "Budget für Arbeit",
      rechtsgrundlage: "§ 61 SGB IX",
      beschreibung:
        "Alternative zur Werkstatt für behinderte Menschen (WfbM): Lohnkostenzuschuss an Arbeitgeber bis 75% des Mindestlohns. Ermöglicht reguläre sozialversicherungspflichtige Beschäftigung.",
      betrag_monatlich_eur: Math.round(0.75 * 12.82 * 167), // 75% des Mindestlohns × Monatsarbeitsstunden
      betrag_hinweis: "Lohnkostenzuschuss bis 75% des Mindestlohns an Arbeitgeber. Nicht direkt an Betroffene.",
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        `GdB ${gdb} (mindestens wesentliche Behinderung)`,
        "Anspruch auf Leistungen in WfbM",
        "Bereitschaft zur Aufnahme in sozialversicherungspflichtiger Beschäftigung",
        "Arbeitgeber muss zustimmen",
      ],
      antrag_bei: "Eingliederungshilfeträger",
      antrag_hinweis:
        "Häufig unterschätztes Angebot. Vorteil: voller Sozialversicherungsschutz statt WfbM-Status.",
      kategorie: "eingliederungshilfe",
      prioritaet: 2,
    });
  }

  return ansprueche;
}

function berechnePauschbetragGdB(gdb: number): number {
  // Pauschbeträge 2021+ nach § 33b EStG
  if (gdb >= 100) return 7400;
  if (gdb >= 90) return 6430;
  if (gdb >= 80) return 5460;
  if (gdb >= 70) return 4500;
  if (gdb >= 60) return 3570;
  if (gdb >= 50) return 3700; // SV: GdB >=50 mit Merkzeichen H/Bl: höherer Pauschbetrag
  if (gdb >= 40) return 860;
  if (gdb >= 30) return 620;
  if (gdb >= 20) return 384;
  return 0;
}

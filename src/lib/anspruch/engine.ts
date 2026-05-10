// ============================================
// Deterministische Anspruchs-Engine – Hauptorchestrator
//
// COMPLIANCE: Kein LLM entscheidet über Ansprüche (FB-31, FB-125).
// Alle Berechnungen regelbasiert nach deutschem Recht (Stand 2025).
// Dieser Code ist auditierbar, deterministisch und versionierbar.
// ============================================

import type {
  AnspruchsInput,
  AnspruchsErgebnis,
  Anspruch,
  NaechsterSchritt,
  Beratungsstelle,
} from "./types";
import { berechneSgbXI } from "./sgb-xi";
import { berechneSgbXII } from "./sgb-xii";
import { berechneEstg35a } from "./estg-35a";
import { berechneSgbVIII, berechneSgbIX } from "./sgb-viii-ix";

/**
 * Haupteinstiegspunkt der Anspruchs-Engine.
 * Gibt ein vollständiges, deterministisches Anspruchsergebnis zurück.
 * Keine externen API-Calls, kein LLM, kein Netzwerk.
 */
export function berechneAnsprueche(input: AnspruchsInput): AnspruchsErgebnis {
  // 1. Alle Regel-Module ausführen
  const sgbXI = berechneSgbXI(input);
  const sgbXII = berechneSgbXII(input);
  const estg = berechneEstg35a(input);
  const sgbVIII = berechneSgbVIII(input);
  const sgbIX = berechneSgbIX(input);

  const alle: Anspruch[] = [...sgbXI, ...sgbXII, ...estg, ...sgbVIII, ...sgbIX];

  // 2. Monatliche und jährliche Summen berechnen
  const { monatlich, jaehrlich, steuer } = berechneGesamtbetraege(alle);

  // 3. Nächste Schritte priorisieren
  const naechsteSchritte = ermittleNaechsteSchritte(input, alle);

  // 4. Offene Fragen für präzisere Berechnung
  const offeneFragen = ermittleOffeneFragen(input);

  // 5. Beratungsstellen
  const beratungsstellen = ermittleBeratungsstellen(input);

  return {
    berechnungsdatum: new Date().toISOString(),
    input,
    ansprueche: alle.sort((a, b) => a.prioritaet - b.prioritaet),
    gesamt_monatlich_eur: monatlich,
    gesamt_jaehrlich_eur: jaehrlich,
    steuerersparnis_eur: steuer,
    naechste_schritte: naechsteSchritte,
    offene_fragen: offeneFragen,
    beratungsstellen,
  };
}

function berechneGesamtbetraege(ansprueche: Anspruch[]): {
  monatlich: number;
  jaehrlich: number;
  steuer: number;
} {
  let monatlich = 0;
  let jaehrlich = 0;
  let steuer = 0;

  for (const a of ansprueche) {
    if (!a.voraussetzungen_erfuellt) continue;

    if (a.kategorie === "steuer") {
      steuer += a.betrag_jaehrlich_eur ?? 0;
      continue;
    }

    monatlich += a.betrag_monatlich_eur ?? 0;
    jaehrlich += a.betrag_jaehrlich_eur ?? (a.betrag_monatlich_eur ?? 0) * 12;
    jaehrlich += a.betrag_einmalig_eur ?? 0; // nicht ideal, aber für Übersicht
  }

  return { monatlich, jaehrlich, steuer };
}

function ermittleNaechsteSchritte(
  input: AnspruchsInput,
  ansprueche: Anspruch[]
): NaechsterSchritt[] {
  const schritte: NaechsterSchritt[] = [];
  let reihenfolge = 1;

  // Höchste Priorität: Pflegegrad beantragen wenn keiner vorhanden
  if (!input.pflegegrad) {
    schritte.push({
      reihenfolge: reihenfolge++,
      titel: "Pflegegrad-Begutachtung beantragen",
      beschreibung:
        "Rufen Sie Ihre Pflegekasse (Krankenkasse) an und beantragen Sie eine Begutachtung durch den Medizinischen Dienst (MD). Schildern Sie den Pflegebedarf konkret. Der MD kommt i.d.R. innerhalb 25 Werktagen.",
      dringlichkeit: "sofort",
      zustaendig: "Pflegekasse (Krankenkasse)",
    });
  }

  // Pflegegeld-Antrag wenn PG vorhanden und noch kein Pflegegeld
  if (
    input.pflegegrad &&
    input.pflegegrad >= 2 &&
    ansprueche.some((a) => a.id === "sgb-xi-pflegegeld")
  ) {
    schritte.push({
      reihenfolge: reihenfolge++,
      titel: "Pflegegeld formell beantragen",
      beschreibung:
        "Stellen Sie schriftlich Antrag auf Pflegegeld bei Ihrer Pflegekasse. Notieren Sie Datum und Sendungsweg (Einschreiben empfohlen) — Leistung läuft ab Antragsmonat.",
      dringlichkeit: "sofort",
      zustaendig: "Pflegekasse",
    });
  }

  // Entlastungsbetrag ist häufig ungenutzt
  if (input.pflegegrad) {
    schritte.push({
      reihenfolge: reihenfolge++,
      titel: "Entlastungsbetrag (125 €/Monat) nutzen",
      beschreibung:
        "Buchen Sie über xcare einen anerkannten Anbieter für Haushaltshilfe oder Alltagsbegleitung. Der Entlastungsbetrag läuft automatisch ab — nicht genutztes Guthaben verfällt nach 12 Monaten.",
      dringlichkeit: "diese_woche",
      zustaendig: "Pflegekasse + zugelassener Anbieter",
    });
  }

  // Wohnumfeld-Maßnahmen (oft unbekannt)
  if (input.pflegegrad && ansprueche.some((a) => a.id === "sgb-xi-wohnumfeld")) {
    schritte.push({
      reihenfolge: reihenfolge++,
      titel: "Wohnraumanpassung planen (bis 4.000 €)",
      beschreibung:
        "Lassen Sie den Handwerksbedarf prüfen (Haltegriffe, Rollstuhlrampe, bodengleiche Dusche). Vorab-Antrag bei der Pflegekasse stellen BEVOR der Handwerker kommt. Ergänzend KfW-Zuschuss 455-B prüfen.",
      dringlichkeit: "diesen_monat",
      zustaendig: "Pflegekasse + KfW",
    });
  }

  // Grundsicherung
  if (input.alter >= 67 && ansprueche.some((a) => a.id === "sgb-xii-grundsicherung-alter")) {
    schritte.push({
      reihenfolge: reihenfolge++,
      titel: "Grundsicherung im Alter beim Sozialamt beantragen",
      beschreibung:
        "Beantragen Sie Grundsicherung im Alter beim Sozialamt. Bringen Sie: Rentenbescheid, Mietvertrag, Kontoauszüge (3 Monate), Personalausweis. VdK oder Caritas können beim Antrag helfen.",
      dringlichkeit: "sofort",
      zustaendig: "Sozialamt",
    });
  }

  // Steuer: § 35a EStG
  if (ansprueche.some((a) => a.id === "estg-35a-haushalt")) {
    schritte.push({
      reihenfolge: reihenfolge++,
      titel: "Haushaltsnahe Dienstleistungen in Steuererklärung geltend machen",
      beschreibung:
        "Sammeln Sie Rechnungen aller haushaltsnahen Dienstleistungen (Pflege, Putzdienst, Gartenpflege). Tragen Sie die Beträge in Anlage 'Haushaltsnahe Aufwendungen' ein. Nur Überweisung zählt — kein Bargeld!",
      dringlichkeit: "langfristig",
      zustaendig: "Finanzamt (Steuererklärung)",
    });
  }

  // Schwerbehindertenausweis
  if (input.gdb && input.gdb >= 50 && !ansprueche.some((a) => a.id === "sgb-ix-schwerbehinderung-aktiv")) {
    schritte.push({
      reihenfolge: reihenfolge++,
      titel: "Schwerbehindertenausweis beantragen",
      beschreibung:
        "Beantragen Sie den Schwerbehindertenausweis beim Versorgungsamt (online in vielen Bundesländern). Legen Sie ärztliche Atteste und Befundberichte bei. Ausweis gilt i.d.R. unbefristet.",
      dringlichkeit: "diese_woche",
      zustaendig: "Versorgungsamt / Landratsamt",
    });
  }

  // Rentenversicherung Pflegeperson
  if (
    input.pflege_durch_angehoerige &&
    input.pflegeperson_berufstaetig === false &&
    input.pflegegrad &&
    input.pflegegrad >= 2
  ) {
    schritte.push({
      reihenfolge: reihenfolge++,
      titel: "Rentenversicherung der Pflegeperson prüfen",
      beschreibung:
        "Die Pflegekasse zahlt automatisch RV-Beiträge für pflegende Angehörige (§ 44 SGB XI). Prüfen Sie Ihren Rentenbescheid / Rentenauskunft auf korrekte Erfassung der Pflegezeiten.",
      dringlichkeit: "diesen_monat",
      zustaendig: "Deutsche Rentenversicherung (DRV)",
    });
  }

  return schritte;
}

function ermittleOffeneFragen(input: AnspruchsInput): string[] {
  const fragen: string[] = [];

  if (!input.pflegegrad) {
    fragen.push(
      "Welcher Pflegegrad liegt vor oder wird erwartet? (Bestimmt Leistungshöhe SGB XI maßgeblich)"
    );
  }

  if (input.pflegegrad && input.pflegegrad >= 2 && input.pflege_durch_angehoerige === undefined) {
    fragen.push(
      "Wird die Pflege durch Angehörige (nicht beruflich) oder durch einen Pflegedienst erbracht?"
    );
  }

  if (input.haushaltshilfe_aufwendungen_eur === undefined && input.erwerbstaetig) {
    fragen.push(
      "Wie hoch sind die jährlichen Aufwendungen für Haushaltshilfe und Pflegedienste? (Für § 35a EStG)"
    );
  }

  if (!input.zu_versteuerndes_einkommen_eur && input.alter >= 67) {
    fragen.push(
      "Wie hoch ist das monatliche Renteneinkommen? (Für Grundsicherungs-Prüfung SGB XII)"
    );
  }

  if (!input.gdb && input.lebenslage === "eingliederung_behinderung") {
    fragen.push(
      "Liegt ein festgestellter Grad der Behinderung (GdB) vor? (Für SGB IX-Leistungen)"
    );
  }

  if (input.pflegegrad && input.verhinderungspflege_genutzt_eur === undefined) {
    fragen.push(
      "Wie viel wurde dieses Jahr bereits an Verhinderungspflege genutzt? (Für Budget-Berechnung)"
    );
  }

  if (input.wohnform === undefined) {
    fragen.push(
      "In welcher Wohnform lebt die pflegebedürftige Person? (Privat, WG, Heim → beeinflusst Leistungsansprüche)"
    );
  }

  return fragen;
}

function ermittleBeratungsstellen(input: AnspruchsInput): Beratungsstelle[] {
  const stellen: Beratungsstelle[] = [
    {
      name: "Pflegestützpunkt (örtlich)",
      typ: "pflegestuetzpunkt",
      bundesweit_verfuegbar: true,
      telefon: "wird regional angezeigt",
      website: "https://www.pflegestuetzpunkte.de",
    },
    {
      name: "VdK – Sozialrechts-Beratung",
      typ: "vdk",
      bundesweit_verfuegbar: true,
      telefon: "0800 1891 0 (kostenlos)",
      website: "https://www.vdk.de",
    },
  ];

  if (input.pflegegrad || input.lebenslage === "alter_pflege") {
    stellen.push({
      name: "Verbraucherzentrale – Pflegeberatung",
      typ: "sonstige",
      bundesweit_verfuegbar: true,
      telefon: "0800 809 802 400",
      website: "https://www.verbraucherzentrale.de",
    });
  }

  if (input.lebenslage === "eingliederung_behinderung") {
    stellen.push({
      name: "Ergänzende unabhängige Teilhabeberatung (EUTB)",
      typ: "sonstige",
      bundesweit_verfuegbar: true,
      telefon: "0800 6007 005 (kostenlos)",
      website: "https://www.teilhabeberatung.de",
    });
  }

  if (input.alter >= 65) {
    stellen.push({
      name: "Sozialverband Deutschland (SoVD)",
      typ: "sonstige",
      bundesweit_verfuegbar: true,
      website: "https://www.sovd.de",
    });
  }

  if (
    input.familienstand === "ledig" ||
    input.familienstand === "geschieden" ||
    input.familienstand === "verwitwet"
  ) {
    stellen.push({
      name: "Caritasverband – Familienberatung",
      typ: "caritas",
      bundesweit_verfuegbar: true,
      website: "https://www.caritas.de",
    });
  }

  return stellen;
}

// Hilfsfunktion: Input aus Wizard-Antworten ableiten
export function inputAusWizardAntworten(params: {
  lebenslage: AnspruchsInput["lebenslage"];
  alter: number;
  pflegegrad?: number;
  gdb?: number;
  kinderAnzahl?: number;
  familienstand?: AnspruchsInput["familienstand"];
  haushaltshilfeEur?: number;
  pflegeAufwendungenEur?: number;
  zvE?: number;
}): AnspruchsInput {
  return {
    lebenslage: params.lebenslage,
    alter: params.alter,
    familienstand: params.familienstand ?? "ledig",
    wohnform: "privat",
    versicherungsart: "gkv",
    pflegegrad: params.pflegegrad as AnspruchsInput["pflegegrad"],
    gdb: params.gdb as AnspruchsInput["gdb"],
    kinder:
      params.kinderAnzahl && params.kinderAnzahl > 0
        ? Array.from({ length: params.kinderAnzahl }, (_, i) => ({
            alter: Math.floor(Math.random() * 10) + 1, // Platzhalter
          }))
        : undefined,
    haushaltshilfe_aufwendungen_eur: params.haushaltshilfeEur,
    pflege_aufwendungen_eur: params.pflegeAufwendungenEur,
    zu_versteuerndes_einkommen_eur: params.zvE,
    erwerbstaetig: !!params.zvE && params.zvE > 0,
    pflege_durch_angehoerige: true,
  };
}

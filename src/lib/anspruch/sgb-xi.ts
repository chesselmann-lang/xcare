// ============================================
// SGB XI – Soziale Pflegeversicherung
// Stand: 2025 (Pflegestärkungsgesetze I-V)
//
// Alle Beträge in EUR/Monat (soweit nicht anders angegeben).
// Quellen: §§ 36-45b SGB XI, Beitragsrecht PVG 2024
// ============================================

import type { AnspruchsInput, Anspruch, Pflegegrad } from "./types";

// ---------- Leistungsbeträge 2025 ----------

const PFLEGEGELD: Record<Pflegegrad, number> = {
  1: 0,      // kein Pflegegeld für PG 1
  2: 332,
  3: 573,
  4: 765,
  5: 947,
};

const SACHLEISTUNGEN: Record<Pflegegrad, number> = {
  1: 0,      // nur Entlastungsbetrag
  2: 761,
  3: 1432,
  4: 1778,
  5: 2200,
};

const TAGESPFLEGE: Record<Pflegegrad, number> = {
  1: 0,
  2: 689,
  3: 1298,
  4: 1612,
  5: 1995,
};

const ENTLASTUNGSBETRAG_MONATLICH = 125; // für alle PG 1-5

const VERHINDERUNGSPFLEGE_MAX_JAEHRLICH = 1612;
const KURZZEITPFLEGE_MAX_JAEHRLICH = 1774;
// Budget-Erhöhung: nicht genutzte Kurzzeitpflege → Verhinderungspflege (max +1612€)
const VERHINDERUNGSPFLEGE_MAX_MIT_ERHOEHUNG = 2418; // = 1612 + 50% von 1612
const KURZZEITPFLEGE_MAX_MIT_ERHOEHUNG = 3548;      // = 1774 + 100% aus VHP-Budget

const WOHNGRUPPEN_ZUSCHLAG = 214;      // § 38a SGB XI, monatlich je Mitglied
const WOHNUMFELD_EINMALIG = 4000;      // § 40 Abs. 4, pro Maßnahme, max 4× pro Pflegebedürftigen

export function berechneSgbXI(input: AnspruchsInput): Anspruch[] {
  const { pflegegrad, wohnform } = input;
  const ansprueche: Anspruch[] = [];

  if (!pflegegrad) {
    // Kein Pflegegrad – ggf. Begutachtung empfehlen
    ansprueche.push({
      id: "sgb-xi-begutachtung",
      titel: "Pflegegrad-Begutachtung beantragen",
      rechtsgrundlage: "§ 18 SGB XI",
      beschreibung:
        "Ohne Pflegegrad keine Leistungen der Pflegeversicherung. Der Medizinische Dienst (MD) prüft die Pflegebedürftigkeit und ermittelt den Pflegegrad (1–5).",
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        "Mitglied der sozialen oder privaten Pflegeversicherung",
        "Mindestens 6 Monate Pflegebedarf erwartet",
      ],
      antrag_bei: "Pflegekasse (Krankenkasse)",
      antrag_hinweis:
        "Antrag formlos per Brief, Telefon oder Online-Formular. MD-Begutachtung erfolgt i.d.R. innerhalb 25 Werktagen (bei Akutsituation 3 Werktage).",
      kategorie: "pflegeversicherung",
      prioritaet: 1,
    });
    return ansprueche;
  }

  // 1. Pflegegeld (§ 37 SGB XI) – für häusliche Pflege durch Angehörige
  const pflegegeld = PFLEGEGELD[pflegegrad];
  if (pflegegeld > 0 && input.pflege_durch_angehoerige !== false) {
    ansprueche.push({
      id: "sgb-xi-pflegegeld",
      titel: `Pflegegeld Pflegegrad ${pflegegrad}`,
      rechtsgrundlage: "§ 37 SGB XI",
      beschreibung:
        "Pflegegeld wird an Pflegebedürftige ausgezahlt, die häusliche Pflege durch nahestehende Personen (Angehörige, Freunde, Nachbarn) sicherstellen. Das Geld kann zur Vergütung der Pflegeperson genutzt werden.",
      betrag_monatlich_eur: pflegegeld,
      betrag_jaehrlich_eur: pflegegeld * 12,
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        `Pflegegrad ${pflegegrad} anerkannt`,
        "Häusliche Pflege (nicht vollstationäre Pflege)",
        "Pflege durch nahestehende Person (nicht professionell)",
      ],
      antrag_bei: "Pflegekasse",
      kombinierbar_mit: ["sgb-xi-entlastungsbetrag", "sgb-xi-verhinderungspflege"],
      nicht_kombinierbar_mit: ["sgb-xi-sachleistungen-voll"],
      antrag_hinweis:
        "Kombinierbar mit 50% Sachleistungen (Kombinationsleistung § 38 SGB XI) oder voll mit Verhinderungs- und Kurzzeitpflege.",
      kategorie: "pflegeversicherung",
      prioritaet: 1,
    });
  }

  // 2. Sachleistungen / Pflegesachleistungen (§ 36 SGB XI) – professionelle Pflegedienste
  const sachleistung = SACHLEISTUNGEN[pflegegrad];
  if (sachleistung > 0) {
    ansprueche.push({
      id: "sgb-xi-sachleistungen",
      titel: `Pflegesachleistungen Pflegegrad ${pflegegrad}`,
      rechtsgrundlage: "§ 36 SGB XI",
      beschreibung:
        "Pflegesachleistungen werden direkt mit zugelassenen ambulanten Pflegediensten abgerechnet. Decken körperbezogene Pflegemaßnahmen, pflegerische Betreuung und Hilfen bei der Haushaltsführung ab.",
      betrag_monatlich_eur: sachleistung,
      betrag_jaehrlich_eur: sachleistung * 12,
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        `Pflegegrad ${pflegegrad} anerkannt`,
        "Zugelassener ambulanter Pflegedienst muss genutzt werden",
        "Häusliche Pflege (nicht vollstationär)",
      ],
      antrag_bei: "Pflegekasse (Abrechnung über Pflegedienst direkt)",
      kombinierbar_mit: ["sgb-xi-entlastungsbetrag", "sgb-xi-tagespflege"],
      nicht_kombinierbar_mit: [],
      kategorie: "pflegeversicherung",
      prioritaet: 1,
    });
  }

  // 3. Entlastungsbetrag (§ 45b SGB XI) – für alle PG 1-5
  ansprueche.push({
    id: "sgb-xi-entlastungsbetrag",
    titel: "Entlastungsbetrag",
    rechtsgrundlage: "§ 45b SGB XI",
    beschreibung:
      "Monatlich 125 € für Alltagsunterstützung, Haushaltshilfe, niedrigschwellige Angebote, Tages-/Nachtpflege und weitere entlastende Leistungen. Nicht ausgegebene Beträge können bis zu 12 Monate übertragen werden.",
    betrag_monatlich_eur: ENTLASTUNGSBETRAG_MONATLICH,
    betrag_jaehrlich_eur: ENTLASTUNGSBETRAG_MONATLICH * 12,
    voraussetzungen_erfuellt: true,
    voraussetzungen_details: [
      `Pflegegrad ${pflegegrad} anerkannt (gilt für PG 1–5)`,
      "Nur zweckgebunden für anerkannte Angebote",
    ],
    antrag_bei: "Pflegekasse",
    antrag_hinweis:
      "Anbieter muss nach Landesrecht anerkannt sein. Nicht als Bargeld auszahlbar. Übertrag in Folgequartal möglich (max. 12 Monate).",
    kombinierbar_mit: ["sgb-xi-pflegegeld", "sgb-xi-sachleistungen", "sgb-xi-tagespflege"],
    kategorie: "pflegeversicherung",
    prioritaet: 1,
  });

  // 4. Tagespflege (§ 41 SGB XI) – ab PG 2
  if (pflegegrad >= 2) {
    const tagespflege = TAGESPFLEGE[pflegegrad];
    ansprueche.push({
      id: "sgb-xi-tagespflege",
      titel: `Tagespflege Pflegegrad ${pflegegrad}`,
      rechtsgrundlage: "§ 41 SGB XI",
      beschreibung:
        "Zuschuss für Tages- und Nachtpflege-Einrichtungen. Wird zusätzlich zu ambulanten Sachleistungen und Pflegegeld gewährt (keine Anrechnung mehr seit PSG II).",
      betrag_monatlich_eur: tagespflege,
      betrag_jaehrlich_eur: tagespflege * 12,
      voraussetzungen_erfuellt: pflegegrad >= 2,
      voraussetzungen_details: [
        `Pflegegrad ${pflegegrad} (mind. PG 2 erforderlich)`,
        "Zugelassene Tages-/Nachtpflegeeinrichtung",
      ],
      antrag_bei: "Pflegekasse",
      antrag_hinweis: "Vollständig kombinierbar mit häuslichen Sachleistungen und Pflegegeld.",
      kombinierbar_mit: ["sgb-xi-sachleistungen", "sgb-xi-pflegegeld", "sgb-xi-entlastungsbetrag"],
      kategorie: "pflegeversicherung",
      prioritaet: 2,
    });
  }

  // 5. Verhinderungspflege (§ 39 SGB XI) – ab PG 2, 6+ Monate Pflege
  if (pflegegrad >= 2) {
    const genutzt = input.verhinderungspflege_genutzt_eur ?? 0;
    const restbudget = Math.max(0, VERHINDERUNGSPFLEGE_MAX_JAEHRLICH - genutzt);
    ansprueche.push({
      id: "sgb-xi-verhinderungspflege",
      titel: "Verhinderungspflege",
      rechtsgrundlage: "§ 39 SGB XI",
      beschreibung:
        "Bis zu 1.612 € pro Jahr (erweiterbar auf 2.418 €) wenn die Pflegeperson verhindert ist (Urlaub, Krankheit etc.). Pflegebedürftige erhält weiter 50% des Pflegegelds während der Verhinderung.",
      betrag_jaehrlich_eur: VERHINDERUNGSPFLEGE_MAX_JAEHRLICH,
      betrag_hinweis:
        restbudget < VERHINDERUNGSPFLEGE_MAX_JAEHRLICH
          ? `Dieses Jahr noch ${restbudget} € verfügbar (${genutzt} € bereits genutzt). Erweiterbar auf max. ${VERHINDERUNGSPFLEGE_MAX_MIT_ERHOEHUNG} € durch nicht genutztes Kurzzeitpflege-Budget.`
          : `Max. ${VERHINDERUNGSPFLEGE_MAX_MIT_ERHOEHUNG} € wenn Kurzzeitpflege-Budget teilweise umgewidmet. Pflegebedürftige behält 50% Pflegegeld.`,
      voraussetzungen_erfuellt: pflegegrad >= 2,
      voraussetzungen_details: [
        "Pflegegrad 2–5",
        "Pflegeperson mindestens 6 Monate häuslich gepflegt",
        "Pflegeperson vorübergehend verhindert (Urlaub, Krankheit, Fortbildung)",
      ],
      antrag_bei: "Pflegekasse",
      antrag_hinweis:
        "Empfehlung: Antrag VOR Beginn der Verhinderung stellen. Auch für bezahlte Laien (z.B. Nachbarn) nutzbar. Verwandte 2. Grades: Abrechnung max. in Höhe des Pflegegelds.",
      kombinierbar_mit: ["sgb-xi-pflegegeld", "sgb-xi-entlastungsbetrag"],
      kategorie: "pflegeversicherung",
      prioritaet: 2,
    });
  }

  // 6. Kurzzeitpflege (§ 42 SGB XI) – ab PG 2
  if (pflegegrad >= 2) {
    const genutzt = input.kurzzeitpflege_genutzt_eur ?? 0;
    const restbudget = Math.max(0, KURZZEITPFLEGE_MAX_JAEHRLICH - genutzt);
    ansprueche.push({
      id: "sgb-xi-kurzzeitpflege",
      titel: "Kurzzeitpflege",
      rechtsgrundlage: "§ 42 SGB XI",
      beschreibung:
        "Stationäre Pflege für max. 56 Tage/Jahr (z.B. nach Krankenhausaufenthalt, Urlaub der Pflegeperson). Budget: 1.774 €/Jahr, erweiterbar auf 3.548 € durch nicht genutztes Verhinderungspflege-Budget.",
      betrag_jaehrlich_eur: KURZZEITPFLEGE_MAX_JAEHRLICH,
      betrag_hinweis:
        restbudget < KURZZEITPFLEGE_MAX_JAEHRLICH
          ? `Dieses Jahr noch ${restbudget} € verfügbar. Max. ${KURZZEITPFLEGE_MAX_MIT_ERHOEHUNG} € erreichbar durch Verhinderungspflege-Umwidmung.`
          : `Erweiterbar auf ${KURZZEITPFLEGE_MAX_MIT_ERHOEHUNG} € wenn Verhinderungspflege-Budget nicht voll genutzt.`,
      voraussetzungen_erfuellt: pflegegrad >= 2,
      voraussetzungen_details: [
        "Pflegegrad 2–5",
        "Stationäre Kurzzeitpflegeeinrichtung (max. 56 Tage/Jahr)",
      ],
      antrag_bei: "Pflegekasse",
      antrag_hinweis:
        "50% Pflegegeld läuft während Kurzzeitpflege weiter. Heimkosten-Eigenanteil (Unterkunft, Verpflegung) selbst tragen.",
      kombinierbar_mit: ["sgb-xi-entlastungsbetrag"],
      kategorie: "pflegeversicherung",
      prioritaet: 2,
    });
  }

  // 7. Pflegehilfsmittel (§ 40 SGB XI) – pauschal
  ansprueche.push({
    id: "sgb-xi-pflegehilfsmittel",
    titel: "Pflegehilfsmittel (Verbrauchsgüter)",
    rechtsgrundlage: "§ 40 Abs. 2 SGB XI",
    beschreibung:
      "Monatlich bis zu 42 € für Verbrauchspflegehilfsmittel (Einmalhandschuhe, Bettschutzeinlagen, Desinfektionsmittel etc.). Einfach per Versandapotheke oder Sanitätshaus beziehen.",
    betrag_monatlich_eur: 42,
    betrag_jaehrlich_eur: 42 * 12,
    voraussetzungen_erfuellt: true,
    voraussetzungen_details: [
      `Pflegegrad ${pflegegrad} anerkannt`,
      "Häusliche Pflege",
    ],
    antrag_bei: "Pflegekasse",
    antrag_hinweis:
      "Viele Pflegekassen liefern Hilfsmittelpaket direkt. Eigenanteil 10%, max. 10 €/Monat. Technische Hilfsmittel (Pflegebett, Rollstuhl) zusätzlich nach § 40 Abs. 1 SGB XI.",
    kategorie: "pflegeversicherung",
    prioritaet: 3,
  });

  // 8. Wohnraumanpassung (§ 40 Abs. 4 SGB XI) – einmalig
  if (pflegegrad >= 1) {
    ansprueche.push({
      id: "sgb-xi-wohnumfeld",
      titel: "Wohnumfeldverbessernde Maßnahmen",
      rechtsgrundlage: "§ 40 Abs. 4 SGB XI",
      beschreibung:
        "Bis zu 4.000 € je Maßnahme (max. 4× pro Pflegebedürftigem, 16.000 € Gesamtlimit) für barrierefreien Umbau: Treppenlifte, bodengleiche Duschen, Türverbreiterung, Haltegriffe etc.",
      betrag_einmalig_eur: WOHNUMFELD_EINMALIG,
      betrag_hinweis: "Bis zu 4× beantragbar (max. 16.000 € Gesamtförderung), je Maßnahme max. 4.000 €.",
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        `Pflegegrad ${pflegegrad} anerkannt`,
        "Eigenanteil 10% (mind. 1 €, max. 400 €/Maßnahme)",
        "Vorab-Antrag empfohlen (Genehmigung vor Beginn der Maßnahme einholen)",
      ],
      antrag_bei: "Pflegekasse",
      antrag_hinweis:
        "Zusätzlich KfW-Zuschuss 455-B (Kreditanstalt für Wiederaufbau) bis 25.000 € bei altersgerechtem Umbau möglich. Vorab Kostenvoranschlag einholen.",
      kombinierbar_mit: ["sgb-xi-sachleistungen"],
      kategorie: "pflegeversicherung",
      prioritaet: 2,
    });
  }

  // 9. Wohngruppen-Zuschlag (§ 38a SGB XI) – bei WG-Form
  if (wohnform === "wohngemeinschaft" && pflegegrad >= 1) {
    ansprueche.push({
      id: "sgb-xi-wohngruppen",
      titel: "Wohngruppen-Zuschlag",
      rechtsgrundlage: "§ 38a SGB XI",
      beschreibung:
        "Monatlich 214 € Zuschlag für jede Person in einer ambulant betreuten Wohngruppe (Pflege-WG). Mindestens 2 Pflegebedürftige, gemeinsame Haushaltsführung, professionelle Pflegeperson vorhanden.",
      betrag_monatlich_eur: WOHNGRUPPEN_ZUSCHLAG,
      betrag_jaehrlich_eur: WOHNGRUPPEN_ZUSCHLAG * 12,
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        "Ambulant betreute Wohngruppe (nicht vollstationäres Heim)",
        "Mind. 2 Pflegebedürftige (PG 1–5) in der Gruppe",
        "Gemeinschaftliche Alltagsgestaltung",
        "Regelmäßig anwesende Pflegeperson durch ambulanten Dienst",
      ],
      antrag_bei: "Pflegekasse",
      antrag_hinweis:
        "Zusätzlich einmaliger WG-Gründungszuschuss: 2.500 € je Person, max. 10.000 € für die WG.",
      kombinierbar_mit: ["sgb-xi-sachleistungen", "sgb-xi-pflegegeld", "sgb-xi-entlastungsbetrag"],
      kategorie: "pflegeversicherung",
      prioritaet: 2,
    });
  }

  // 10. Pflegeperson-Rentenversicherung (§ 44 SGB XI) – bei Angehörigen-Pflege
  if (input.pflege_durch_angehoerige && input.pflegeperson_berufstaetig === false && pflegegrad >= 2) {
    ansprueche.push({
      id: "sgb-xi-pflegeperson-rente",
      titel: "Rentenversicherung für Pflegepersonen",
      rechtsgrundlage: "§ 44 SGB XI",
      beschreibung:
        "Die Pflegekasse zahlt Rentenversicherungsbeiträge für nicht erwerbsmäßig pflegende Angehörige. Höhe abhängig von Pflegegrad und Pflegeumfang (14–28 Stunden/Woche). Ab PG 2 mindestens 14 Std./Woche Pflege erforderlich.",
      betrag_monatlich_eur: berechnePflegepersonRente(pflegegrad),
      betrag_hinweis: `Beitrag zur gesetzlichen Rentenversicherung, nicht als Bargeld. Entspricht ${berechnePflegepersonRenteprozent(pflegegrad)}% eines Durchschnittsverdienstpunkts.`,
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        `Pflegegrad ${pflegegrad} (mind. PG 2)`,
        "Pflegeperson nicht oder weniger als 30 Std./Woche erwerbstätig",
        `Pflegepflege mindestens ${pflegegrad >= 3 ? 21 : 14} Stunden/Woche`,
        "Häusliche Pflege in Deutschland",
      ],
      antrag_bei: "Pflegekasse (automatisch bei Pflegegeldantrag)",
      antrag_hinweis:
        "Kein gesonderter Antrag nötig — die Pflegekasse meldet die Pflegeperson automatisch bei der RV an.",
      kategorie: "rentenversicherung",
      prioritaet: 2,
    });
  }

  // 11. Unfallversicherung Pflegepersonen (§ 44a SGB XI)
  if (input.pflege_durch_angehoerige && pflegegrad >= 2) {
    ansprueche.push({
      id: "sgb-xi-pflegeperson-uv",
      titel: "Unfallversicherungsschutz für Pflegepersonen",
      rechtsgrundlage: "§ 44a SGB XI",
      beschreibung:
        "Pflegepersonen sind bei der Ausübung der Pflege gesetzlich unfallversichert (Berufsgenossenschaft). Kostenlos, kein Antrag erforderlich.",
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        "Nicht erwerbsmäßige Pflegeperson (Angehörige/Freunde)",
        `Pflegegrad ${pflegegrad} des Pflegebedürftigen`,
      ],
      antrag_bei: "Läuft automatisch über Pflegekasse",
      kategorie: "unfallversicherung",
      prioritaet: 3,
    });
  }

  return ansprueche;
}

function berechnePflegepersonRente(pflegegrad: Pflegegrad): number {
  // Grobe Monatsbeiträge zur RV (abhängig von PG und Pflegestunden)
  // Quelle: § 44 SGB XI, Beitragssatz 18,6% auf fiktives Arbeitsentgelt
  const beitraege: Record<Pflegegrad, number> = {
    1: 0,
    2: 190,
    3: 252,
    4: 296,
    5: 339,
  };
  return beitraege[pflegegrad];
}

function berechnePflegepersonRenteprozent(pflegegrad: Pflegegrad): number {
  const prozente: Record<Pflegegrad, number> = {
    1: 0, 2: 27, 3: 36, 4: 43, 5: 49,
  };
  return prozente[pflegegrad];
}

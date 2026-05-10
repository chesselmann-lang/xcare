// ============================================
// § 35a EStG – Steuerermäßigung für
// haushaltsnahe Dienstleistungen & Pflege
// Stand: 2025
// ============================================

import type { AnspruchsInput, Anspruch } from "./types";

const STEUERMAESSIGUNG_SATZ = 0.20;                    // 20%
const MAX_AUFWENDUNGEN_HAUSHALT = 20_000;              // EUR/Jahr
const MAX_STEUERMAESSIGUNG_HAUSHALT = 4_000;           // = 20% von 20.000
const MAX_AUFWENDUNGEN_HANDWERKER = 6_000;
const MAX_STEUERMAESSIGUNG_HANDWERKER = 1_200;         // = 20% von 6.000
const MAX_AUFWENDUNGEN_MINIJOB = 2_550;                // 510€/Monat Lohngrenze
const MAX_STEUERMAESSIGUNG_MINIJOB = 510;              // = 20% von 2.550

export function berechneEstg35a(input: AnspruchsInput): Anspruch[] {
  const ansprueche: Anspruch[] = [];

  if (!input.erwerbstaetig && !input.zu_versteuerndes_einkommen_eur) {
    // Keine Steuer → keine Steuerermäßigung nutzbar
    return ansprueche;
  }

  // 1. Haushaltsnahe Dienstleistungen (§ 35a Abs. 2 S. 1 EStG)
  // Pflege, Betreuung, Reinigung, Gartenpflege
  const haushaltsAufwendungen = input.haushaltshilfe_aufwendungen_eur ?? 0;
  const pflegeAufwendungen = input.pflege_aufwendungen_eur ?? 0;
  const gesamtHaushalt = Math.min(
    haushaltsAufwendungen + pflegeAufwendungen,
    MAX_AUFWENDUNGEN_HAUSHALT
  );
  const steuerersparnis = Math.min(
    gesamtHaushalt * STEUERMAESSIGUNG_SATZ,
    MAX_STEUERMAESSIGUNG_HAUSHALT
  );

  if (gesamtHaushalt > 0) {
    ansprueche.push({
      id: "estg-35a-haushalt",
      titel: "§ 35a EStG – Haushaltsnahe Dienstleistungen & Pflege",
      rechtsgrundlage: "§ 35a Abs. 2 S. 1 EStG",
      beschreibung:
        "20% der Aufwendungen für Haushaltshilfe, Pflege, Betreuung, Gartenpflege etc. direkt von der Steuerschuld abziehbar (kein Abzug als Sonderausgabe, sondern direkte Steuerminderung). Max. 20.000 € Aufwendungen → max. 4.000 € Steuerersparnis.",
      betrag_jaehrlich_eur: Math.round(steuerersparnis),
      betrag_hinweis: `Bei ${gesamtHaushalt.toLocaleString("de-DE")} € Aufwendungen → ${Math.round(steuerersparnis).toLocaleString("de-DE")} € Steuerersparnis. Max. 4.000 €/Jahr erreichbar.`,
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        "Dienstleistung wird im eigenen Haushalt erbracht",
        "Rechnung und Überweisung (kein Barzahlung!)",
        "Steuerpflicht in Deutschland (Einkommen versteuert)",
        "Nicht gefördert durch andere steuerliche Vergünstigungen",
        "Für Pflege: auch ambulante Pflegedienste abrechenbar",
      ],
      antrag_bei: "Finanzamt (Einkommensteuererklärung, Anlage Haushaltsnahe Aufwendungen)",
      antrag_hinweis:
        "Wichtig: Rechnungen aufbewahren, nur Überweisungen gelten (kein Bargeld). Bei Pflege: auch Kosten für Tages-/Nachtpflege und ambulante Dienste absetzbar. Nicht kombinierbar mit Betriebsausgabenabzug.",
      kombinierbar_mit: ["sgb-xi-pflegegeld", "sgb-xi-sachleistungen"],
      kategorie: "steuer",
      prioritaet: 2,
    });
  }

  // 2. Pflegekosten als außergewöhnliche Belastung (§ 33 EStG)
  // Wenn Eigenanteil Pflegeheim erheblich
  if (pflegeAufwendungen > 5000) {
    const zumutbarerEigenanteil = berechneZumutbarerAnteil(
      input.zu_versteuerndes_einkommen_eur ?? 0,
      input.familienstand === "verheiratet",
      (input.kinder?.length ?? 0) > 0
    );
    const abzugsfaehig = Math.max(0, pflegeAufwendungen - zumutbarerEigenanteil);

    if (abzugsfaehig > 0) {
      ansprueche.push({
        id: "estg-33-pflege-aussergewoehnlich",
        titel: "§ 33 EStG – Pflegekosten als außergewöhnliche Belastung",
        rechtsgrundlage: "§ 33 EStG",
        beschreibung:
          "Pflegekosten (Heimunterbringung, ungedeckter Pflegeaufwand) als außergewöhnliche Belastung absetzbar, soweit sie zumutbare Eigenbelastung übersteigen. Direkt als Sonderausgabe – senkt das zu versteuernde Einkommen.",
        betrag_hinweis: `Schätzung: ca. ${abzugsfaehig.toLocaleString("de-DE")} € nach Abzug der zumutbaren Eigenbelastung (${zumutbarerEigenanteil.toLocaleString("de-DE")} €). Individuelle Berechnung im Steuerberater-Gespräch.`,
        voraussetzungen_erfuellt: abzugsfaehig > 0,
        voraussetzungen_details: [
          "Pflegekosten übersteigen zumutbaren Eigenanteil (abhängig von Einkommen, Familienstand, Kinder)",
          "Krankheitsbedingte Pflegebedürftigkeit",
          "Nachweis durch Arzt/Pflegegutachten",
        ],
        antrag_bei: "Finanzamt (Einkommensteuererklärung)",
        antrag_hinweis:
          "Nicht kombinierbar mit § 35a EStG für dieselbe Aufwendung. Steuerberater oder Lohnsteuerhilfeverein (VLH, Lohi) empfohlen.",
        kategorie: "steuer",
        prioritaet: 3,
      });
    }
  }

  // 3. Pflege-Pauschbetrag (§ 33b Abs. 6 EStG)
  // Für pflegende Angehörige (die selbst keinen Lohn erhalten)
  if (input.pflege_durch_angehoerige && input.pflegegrad) {
    const pauschbetrag = berechnetPflegePauschbetrag(input.pflegegrad as 2 | 3 | 4 | 5);
    if (pauschbetrag > 0) {
      ansprueche.push({
        id: "estg-33b-pflegepauschbetrag",
        titel: "Pflege-Pauschbetrag für Pflegepersonen",
        rechtsgrundlage: "§ 33b Abs. 6 EStG",
        beschreibung:
          "Pflegende Angehörige können ohne Einzelnachweis den Pflege-Pauschbetrag geltend machen. Mindert das zu versteuernde Einkommen direkt. Gilt für unentgeltliche Pflege im Haushalt des Pflegebedürftigen oder Pflegeperson.",
        betrag_jaehrlich_eur: pauschbetrag,
        betrag_hinweis: `${pauschbetrag.toLocaleString("de-DE")} €/Jahr Pauschbetrag für Pflegegrad ${input.pflegegrad}. Kann gesplittet werden bei mehreren Pflegepersonen.`,
        voraussetzungen_erfuellt: true,
        voraussetzungen_details: [
          `Pflegegrad ${input.pflegegrad} (mind. PG 2)`,
          "Pflege persönlich (nicht professionell/beruflich)",
          "Pflege unentgeltlich (keine Vergütung aus Pflegegeld)",
          "Pflege in inländischem Haushalt",
        ],
        antrag_bei: "Finanzamt (Einkommensteuererklärung, Anlage Außergewöhnliche Belastungen)",
        antrag_hinweis:
          "Kein Einzelnachweis nötig! Nur Nachweis des Pflegegrads des Pflegebedürftigen. Aufteilung auf mehrere Pflegepersonen je nach tatsächlichem Pflegeanteil möglich.",
        kategorie: "steuer",
        prioritaet: 2,
      });
    }
  }

  return ansprueche;
}

function berechnetPflegePauschbetrag(pflegegrad: 2 | 3 | 4 | 5): number {
  const pauschbetraege: Record<number, number> = {
    2: 600,
    3: 1100,
    4: 1800,
    5: 1800,
  };
  return pauschbetraege[pflegegrad] ?? 0;
}

function berechneZumutbarerAnteil(
  zvE: number,
  verheiratet: boolean,
  hatKinder: boolean
): number {
  // Vereinfachte Berechnung nach § 33 Abs. 3 EStG
  const stufen = [
    { bis: 15340, ledig: 0.05, verheiratet: 0.04, mitKind: 0.02 },
    { bis: 51130, ledig: 0.06, verheiratet: 0.05, mitKind: 0.03 },
    { bis: Infinity, ledig: 0.07, verheiratet: 0.06, mitKind: 0.04 },
  ];

  let zumutbar = 0;
  let restEinkommen = zvE;

  for (const stufe of stufen) {
    const satz = hatKinder
      ? stufe.mitKind
      : verheiratet
      ? stufe.verheiratet
      : stufe.ledig;
    const inStufe = Math.min(restEinkommen, stufe.bis);
    zumutbar += inStufe * satz;
    restEinkommen -= inStufe;
    if (restEinkommen <= 0) break;
  }

  return Math.round(zumutbar);
}

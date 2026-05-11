// ============================================
// SGB VI – Rente: Witwenrente, Erwerbsminderung, Pflegepersonen-Rente
// Stand: 2025 (Rentenwert West: 40,17 €/Entgeltpunkt)
//
// COMPLIANCE: Deterministisch, kein LLM (FB-31, FB-125)
// ============================================

import type { AnspruchsInput, Anspruch } from "./types";

// ── Rentenwerte 2025 ──────────────────────────────────────────────────────
const RENTENWERT_WEST = 40.17;   // € je Entgeltpunkt ab 1.7.2024
const RENTENWERT_OST  = 39.32;   // € je Entgeltpunkt (Ost)

// ── Witwenrente-Quoten (§§ 46, 65 SGB VI) ────────────────────────────────
const KLEINE_WITWENRENTE_QUOTE  = 0.25;  // 25 % der Versichertenrente (2 Jahre)
const GROSSE_WITWENRENTE_QUOTE  = 0.55;  // 55 % (mit Kindern oder ab 47 Jahren)

// ── Erwerbsminderungsrente-Näherung (§ 43 SGB VI) ────────────────────────
const EM_RENTE_VOLL_QUOTE = 0.667;   // ca. 2/3 der Vollrente

// ── Pflegepersonen-Rentenversicherung (§ 3 SGB VI) ───────────────────────
const PFLEGE_ENTGELTPUNKTE: Record<number, number> = {
  2: 0.277,  // Pflegegrad 2: 0,277 EP/Jahr
  3: 0.422,  // Pflegegrad 3
  4: 0.561,  // Pflegegrad 4
  5: 0.561,  // Pflegegrad 5 (wie PG 4)
};

export function berechneSgbVI(input: AnspruchsInput): Anspruch[] {
  const ansprueche: Anspruch[] = [];

  // ── 1. Witwenrente / Witwerrente (§§ 46, 65 SGB VI) ─────────────────
  if (input.familienstand === "verwitwet" || input.lebenslage === "trauer_nachlass") {
    const hatKinder = (input.kinder?.length ?? 0) > 0;
    const anspruchGroßeRente = hatKinder || input.alter >= 47;
    const quote = anspruchGroßeRente ? GROSSE_WITWENRENTE_QUOTE : KLEINE_WITWENRENTE_QUOTE;

    // Wenn kein Einkommen angegeben, typische Witwen-/Witwerrente zeigen
    const gemittelteBasisrente = 1200; // typische Altersrente in DE
    const witweRente = Math.round(gemittelteBasisrente * quote);

    ansprueche.push({
      id: "sgb6_witwen_rente",
      titel: anspruchGroßeRente ? "Große Witwen-/Witwerrente" : "Kleine Witwen-/Witwerrente",
      rechtsgrundlage: "§§ 46, 65 SGB VI",
      beschreibung: anspruchGroßeRente
        ? `55 % der Versichertenrente des/der Verstorbenen als monatliche Rente. ${hatKinder ? "Berechtigt durch Kindererziehung." : "Ab dem 47. Lebensjahr oder bei Erwerbsminderung."}`
        : `25 % der Versichertenrente, begrenzt auf 24 Monate nach dem Todesfall.`,
      betrag_monatlich_eur: witweRente,
      betrag_hinweis: `Schätzung: ${quote * 100} % der Versichertenrente des/der Verstorbenen. Exakter Betrag von der Deutschen Rentenversicherung berechnet.`,
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        "Versicherter war in DRV rentenversichert",
        "Ehezeit / eingetragene Partnerschaft mind. 1 Jahr",
        `Rentenart: ${anspruchGroßeRente ? "Große Witwenrente (55 %)" : "Kleine Witwenrente (25 %, 24 Monate)"}`,
        `Grund für große Rente: ${hatKinder ? "Kinder unter 18 / in Ausbildung ✓" : input.alter >= 47 ? "Alter ≥ 47 Jahre ✓" : "nicht erfüllt"}`,
        "Einkommensanrechnung: eigenes Einkommen > 950 €/Monat wird zu 40 % angerechnet",
      ],
      antrag_bei: "Deutsche Rentenversicherung (DRV)",
      antrag_hinweis: "Antrag innerhalb von 3 Monaten nach Todesfall stellen, um rückwirkende Zahlung sicherzustellen. Tel: 0800 1000 4800.",
      kategorie: "rentenversicherung",
      prioritaet: 1,
    });
  }

  // ── 2. Erwerbsminderungsrente (§ 43 SGB VI) ──────────────────────────
  if (
    (input.lebenslage === "krankheit_genesung" || input.lebenslage === "eingliederung_behinderung") &&
    input.alter < 65
  ) {
    const monatlichBrutto = input.zu_versteuerndes_einkommen_eur
      ? Math.round(input.zu_versteuerndes_einkommen_eur / 12)
      : 1800; // Medianeinkommen als Näherung

    // Vereinfachte Näherung: ~40 % des letzten Bruttogehalts bei voll EM
    const emRente = Math.round(monatlichBrutto * 0.38);

    ansprueche.push({
      id: "sgb6_em_rente",
      titel: "Erwerbsminderungsrente (volle/teilweise EM)",
      rechtsgrundlage: "§ 43 SGB VI",
      beschreibung:
        "Bei dauerhafter Erkrankung/Behinderung und Unfähigkeit, mehr als 6h/Tag (teilweise) oder 3h/Tag (voll) zu arbeiten. Berechnet wie Altersrente mit Zurechnungszeiten bis 67.",
      betrag_monatlich_eur: emRente,
      betrag_hinweis: `Schätzung: ~${emRente} €/Monat. Exakter Betrag abhängig von Ihrem Rentenversicherungsverlauf. DRV-Renteninfo anfordern.`,
      voraussetzungen_erfuellt: input.lebenslage === "krankheit_genesung" || input.lebenslage === "eingliederung_behinderung",
      voraussetzungen_details: [
        "Mindestens 5 Jahre Wartezeit (60 Pflichtbeitrags-Monate)",
        "In den letzten 5 Jahren mindestens 3 Jahre Pflichtbeiträge",
        "Volle EM: < 3h täglich arbeitsfähig; Teilweise EM: 3–6h/Tag",
        "Rentenantrag plus ärztliche Gutachten erforderlich",
        "Einkommensgrenze bei Teilrente: Hinzuverdienst bis ~17.823 €/Jahr (2025)",
      ],
      antrag_bei: "Deutsche Rentenversicherung (DRV)",
      antrag_hinweis:
        "Antrag frühzeitig stellen. DRV-Beratung: 0800 1000 4800. Reha-Angebot (§ 9 SGB VI) prüfen vor Rentenantrag.",
      kategorie: "rentenversicherung",
      prioritaet: 1,
    });
  }

  // ── 3. Pflegepersonen-Rentenversicherung (§ 3 S. 1 Nr. 1a SGB VI) ────
  if (input.pflege_durch_angehoerige && input.pflegegrad && input.pflegegrad >= 2) {
    const epJahr = PFLEGE_ENTGELTPUNKTE[input.pflegegrad] ?? 0.277;
    const renteJeEpJahr = Math.round(RENTENWERT_WEST * epJahr);

    ansprueche.push({
      id: "sgb6_pflegeperson_rente",
      titel: "Rentenversicherung für Pflegepersonen",
      rechtsgrundlage: "§ 3 Satz 1 Nr. 1a SGB VI",
      beschreibung: `Die Pflegekasse zahlt Rentenversicherungsbeiträge für pflegende Angehörige, die mind. 10h/Woche (an mind. 2 Tagen) pflegen und dabei max. 30h/Woche erwerbstätig sind.`,
      betrag_jaehrlich_eur: renteJeEpJahr,
      betrag_hinweis: `Bei Pflegegrad ${input.pflegegrad}: ${epJahr} Entgeltpunkte/Jahr × ${RENTENWERT_WEST} € = ${renteJeEpJahr} €/Jahr zusätzliche Rentenanwartschaft.`,
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        `Pflegegrad ${input.pflegegrad} anerkannt: ✓`,
        "Pflege mind. 10h/Woche an mind. 2 Tagen",
        "Pflegeperson max. 30h/Woche erwerbstätig",
        "Pflege in häuslicher Umgebung",
        `Rentenanwartschaft: +${epJahr} EP/Jahr = +${renteJeEpJahr} €/Monat Rente je Pflegejahr`,
        "Beiträge trägt vollständig die Pflegekasse – keine Kosten für Pflegeperson",
      ],
      antrag_bei: "Pflegekasse (automatisch bei Pflegegeld-Antrag möglich)",
      antrag_hinweis:
        "Pflegekasse informiert DRV automatisch, wenn Pflegeperson bekannt ist. Sonst: Formular bei Pflegekasse einreichen.",
      kombinierbar_mit: ["sgb11_pflegegeld"],
      kategorie: "rentenversicherung",
      prioritaet: 2,
    });

    // Unfallversicherung Pflegepersonen (SGB VII)
    ansprueche.push({
      id: "sgb7_pflegeperson_uv",
      titel: "Gesetzliche Unfallversicherung für Pflegepersonen",
      rechtsgrundlage: "§ 2 Abs. 1 Nr. 17 SGB VII",
      beschreibung:
        "Pflegende Angehörige sind automatisch und kostenlos gesetzlich unfallversichert gegen Arbeitsunfälle während der Pflege.",
      betrag_monatlich_eur: 0,
      betrag_hinweis: "Kostenlose Absicherung – kein Antrag, keine Beiträge. Leistet bei Unfall während der Pflegetätigkeit.",
      voraussetzungen_erfuellt: true,
      voraussetzungen_details: [
        "Automatischer Schutz bei nicht-erwerbsmäßiger Pflege",
        "Gilt für Sturz, Hebeverletzungen, Wegeunfälle während Pflegetätigkeit",
        "Zuständige Berufsgenossenschaft: BGW (Berufsgenossenschaft für Gesundheitsdienst und Wohlfahrtspflege)",
      ],
      antrag_bei: "Automatisch (kein Antrag erforderlich)",
      kategorie: "unfallversicherung",
      prioritaet: 3,
    });
  }

  // ── 4. Waisenrente (§§ 48, 49 SGB VI) ────────────────────────────────
  if (input.lebenslage === "trauer_nachlass" && (input.kinder?.length ?? 0) > 0) {
    const kinderUnter27 = input.kinder!.filter((k) => k.alter < 27).length;
    if (kinderUnter27 > 0) {
      const waisenrente = Math.round(1200 * 0.10); // Halbwaise: 10 %, Vollwaise: 20 %

      ansprueche.push({
        id: "sgb6_waisenrente",
        titel: "Waisenrente (Halb- / Vollwaise)",
        rechtsgrundlage: "§§ 48, 49 SGB VI",
        beschreibung:
          "Kinder unter 18 Jahren (bei Ausbildung bis 27) erhalten Waisenrente, wenn ein Elternteil verstorben ist. Halbwaise: 10 %, Vollwaise: 20 % der Versichertenrente.",
        betrag_monatlich_eur: waisenrente * kinderUnter27,
        betrag_hinweis: `Schätzung: ~${waisenrente} €/Monat je Kind (Halbwaisenrente). ${kinderUnter27} ${kinderUnter27 === 1 ? "Kind" : "Kinder"}: ~${waisenrente * kinderUnter27} €/Monat gesamt.`,
        voraussetzungen_erfuellt: true,
        voraussetzungen_details: [
          `${kinderUnter27} ${kinderUnter27 === 1 ? "Kind" : "Kinder"} unter 27 Jahren ✓`,
          "Verstorbener Elternteil rentenversichert (Wartezeit: mind. 5 Jahre)",
          "Halbwaise: ein Elternteil verstorben (10 %); Vollwaise: beide (20 %)",
          "Befristet bis 18. Lebensjahr, verlängerbar bei Ausbildung bis 27",
        ],
        antrag_bei: "Deutsche Rentenversicherung (DRV)",
        antrag_hinweis: "Zeitnah nach Todesfall beantragen. Rückwirkend max. 12 Monate.",
        kategorie: "rentenversicherung",
        prioritaet: 1,
      });
    }
  }

  return ansprueche;
}

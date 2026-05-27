// ============================================================
// F35: Pflegeperson-Rechte-Checker — Situationsfragen + Logik
// Deterministisch, kein LLM, auditierbar.
// ============================================================

// ─── Typen ───────────────────────────────────────────────────────────────────

export interface SituationsFrage {
  id: string;
  frage: string;
  typ: "boolean" | "select";
  optionen?: string[];
  hilfe?: string;
}

// ─── 8 Situationsfragen ──────────────────────────────────────────────────────

export const SITUATIONS_FRAGEN: SituationsFrage[] = [
  {
    id: "ag_15",
    frage: "Sind Sie bei einem Arbeitgeber mit mindestens 15 Beschäftigten angestellt?",
    typ: "boolean",
    hilfe:
      "Viele Rechte aus dem Pflegezeitgesetz (PflegeZG) gelten nur für Beschäftigte in Betrieben ab 15 Mitarbeitenden. Bei kleineren Betrieben gelten teilweise andere Regelungen.",
  },
  {
    id: "angehoerig_pflegebeduerftig",
    frage: "Ist ein naher Angehöriger von Ihnen pflegebedürftig?",
    typ: "boolean",
    hilfe:
      "Nahe Angehörige sind Eltern, Schwiegereltern, Stiefeltern, Ehegatten, Lebenspartner, Partner in eheähnlichen Lebensgemeinschaften, Geschwister, Kinder, Adoptiv- oder Pflegekinder sowie die Kinder des Ehegatten oder Lebenspartners.",
  },
  {
    id: "pflegegrad",
    frage: "Welchen Pflegegrad hat die pflegebedürftige Person?",
    typ: "select",
    optionen: ["kein", "1", "2", "3", "4", "5"],
    hilfe:
      "Der Pflegegrad wird vom Medizinischen Dienst (MD) festgestellt. Auch ohne Pflegegrad kann in akuten Fällen ein Anspruch auf kurzzeitige Freistellung bestehen.",
  },
  {
    id: "hauptsaechlich_pflegend",
    frage:
      "Übernehmen Sie die häusliche Pflege hauptsächlich selbst (mindestens 14 Stunden pro Woche)?",
    typ: "boolean",
    hilfe:
      "Für die Rentenversicherungspflicht und den Unfallversicherungsschutz (§ 44a SGB XI) ist ein Pflegeumfang von mindestens 10 Stunden pro Woche an mindestens 2 Tagen erforderlich. 14 Stunden ist ein Richtwert für \"hauptsächlich pflegend\".",
  },
  {
    id: "haeusliche_pflege",
    frage: "Findet die Pflege überwiegend zu Hause statt (häusliche Pflege)?",
    typ: "boolean",
    hilfe:
      "Häusliche Pflege bedeutet, dass die pflegebedürftige Person in ihrer Privatwohnung oder Ihrem Haushalt gepflegt wird – nicht in einem Pflegeheim.",
  },
  {
    id: "pflegezeit_beantragt",
    frage: "Haben Sie bereits Pflegezeit oder Familienpflegezeit beantragt oder angekündigt?",
    typ: "boolean",
    hilfe:
      "Sobald Sie Pflegezeit oder Familienpflegezeit beim Arbeitgeber schriftlich ankündigen, greift der gesetzliche Kündigungsschutz – auch schon vor dem offiziellen Beginn der Freistellung.",
  },
  {
    id: "akuter_pflegefall",
    frage: "Ist die Pflegesituation akut und unvorhergesehen eingetreten?",
    typ: "boolean",
    hilfe:
      "Ein akuter Pflegefall liegt vor, wenn eine plötzliche Verschlechterung des Gesundheitszustands des Angehörigen Sie zwingt, sofort Maßnahmen zu ergreifen – zum Beispiel nach einem Krankenhausaufenthalt, Sturz oder Schlaganfall.",
  },
  {
    id: "letzte_lebensphase",
    frage: "Befindet sich Ihr Angehöriger in der letzten Lebensphase (Palliativsituation)?",
    typ: "boolean",
    hilfe:
      "Die letzte Lebensphase liegt vor, wenn ein Arzt bescheinigt, dass mit dem baldigen Tod des Angehörigen zu rechnen ist. In diesem Fall besteht ein Anspruch auf Begleitungsfreistellung nach § 5 PflegeZG.",
  },
];

// ─── Rechte-IDs (entsprechen den Seed-Einträgen in der DB) ──────────────────
// Die IDs werden per Titel-Lookup zur Laufzeit aufgelöst.
// Hier verwenden wir symbolische Schlüssel, die im Client gegen DB-IDs gemappt werden.
// Für die berechneRechte-Funktion geben wir paragraph-basierte Schlüssel zurück.

export type RechteKey =
  | "pflegezg_3"       // Kurzzeitige Arbeitsverhinderung
  | "pflegezg_4"       // Pflegezeit
  | "fpfzg_2"          // Familienpflegezeit
  | "pflegezg_5"       // Begleitung letzte Lebensphase
  | "pflegezg_kuendigung" // Kündigungsschutz
  | "sgb11_44a_rente"  // Soziale Sicherung Rente + UV
  | "sgb11_37"         // Pflegegeld
  | "sgb11_45b"        // Entlastungsbetrag
  | "arbschg_3"        // Arbeitgeberpflichten
  | "sgb11_44a_kv"     // KV/PV Schutz
  | "sgb11_45"         // Schulungsanspruch
  | "sgb11_44a_geld";  // Pflegeunterstützungsgeld

/**
 * Berechnet die anwendbaren Rechte deterministisch anhand der Situationsantworten.
 * Gibt ein Array von RechteKeys zurück.
 */
export function berechneRechte(
  situation: Record<string, string | boolean>
): RechteKey[] {
  const rechte: RechteKey[] = [];

  const ag15 = situation["ag_15"] === true;
  const angehoerigPflegebeduerftig =
    situation["angehoerig_pflegebeduerftig"] === true;
  const pflegegrad = situation["pflegegrad"] as string | undefined;
  const pflegegradNr =
    pflegegrad && pflegegrad !== "kein" ? parseInt(pflegegrad, 10) : 0;
  const hauptsaechlichPflegend = situation["hauptsaechlich_pflegend"] === true;
  const haeuslichePflege = situation["haeusliche_pflege"] === true;
  const pflegezeitBeantragt = situation["pflegezeit_beantragt"] === true;
  const akuterPflegefall = situation["akuter_pflegefall"] === true;
  const letzteLebensphaseBool = situation["letzte_lebensphase"] === true;

  // ── § 3 PflegeZG: Kurzzeitige Arbeitsverhinderung ──────────────────────────
  if (ag15 && angehoerigPflegebeduerftig && akuterPflegefall) {
    rechte.push("pflegezg_3");
  }

  // ── Pflegeunterstützungsgeld (setzt § 3 PflegeZG voraus) ───────────────────
  if (ag15 && angehoerigPflegebeduerftig && akuterPflegefall) {
    rechte.push("sgb11_44a_geld");
  }

  // ── § 4 PflegeZG: Pflegezeit ────────────────────────────────────────────────
  if (ag15 && angehoerigPflegebeduerftig && haeuslichePflege && pflegegradNr >= 1) {
    rechte.push("pflegezg_4");
  }

  // ── § 2 FPfZG: Familienpflegezeit ──────────────────────────────────────────
  // Gilt ab 25 MA, aber wir können das hier nicht unterscheiden → wir zeigen es
  // wenn Arbeitgeber ≥15 MA (AG15 als Proxy) und Pflegesituation passt.
  if (ag15 && angehoerigPflegebeduerftig && haeuslichePflege && pflegegradNr >= 1) {
    rechte.push("fpfzg_2");
  }

  // ── § 5 PflegeZG: Begleitung in letzter Lebensphase ────────────────────────
  if (ag15 && angehoerigPflegebeduerftig && letzteLebensphaseBool) {
    rechte.push("pflegezg_5");
  }

  // ── Kündigungsschutz ────────────────────────────────────────────────────────
  if (
    ag15 &&
    angehoerigPflegebeduerftig &&
    (pflegezeitBeantragt || letzteLebensphaseBool || (haeuslichePflege && pflegegradNr >= 1))
  ) {
    rechte.push("pflegezg_kuendigung");
  }

  // ── § 44a SGB XI: Soziale Sicherung (Rente + UV) ───────────────────────────
  if (
    angehoerigPflegebeduerftig &&
    haeuslichePflege &&
    hauptsaechlichPflegend &&
    pflegegradNr >= 2
  ) {
    rechte.push("sgb11_44a_rente");
  }

  // ── § 44a SGB XI: KV/PV Schutz ─────────────────────────────────────────────
  if (
    angehoerigPflegebeduerftig &&
    haeuslichePflege &&
    hauptsaechlichPflegend &&
    pflegegradNr >= 2
  ) {
    rechte.push("sgb11_44a_kv");
  }

  // ── § 37 SGB XI: Pflegegeld ─────────────────────────────────────────────────
  if (
    angehoerigPflegebeduerftig &&
    haeuslichePflege &&
    pflegegradNr >= 2
  ) {
    rechte.push("sgb11_37");
  }

  // ── § 45b SGB XI: Entlastungsbetrag ────────────────────────────────────────
  if (angehoerigPflegebeduerftig && haeuslichePflege && pflegegradNr >= 1) {
    rechte.push("sgb11_45b");
  }

  // ── § 3 ArbSchG: Arbeitgeberpflichten Gesundheitsschutz ─────────────────────
  if (ag15 && hauptsaechlichPflegend) {
    rechte.push("arbschg_3");
  }

  // ── § 45 SGB XI: Schulungsanspruch ─────────────────────────────────────────
  if (angehoerigPflegebeduerftig && haeuslichePflege) {
    rechte.push("sgb11_45");
  }

  return rechte;
}

// ─── Kategorie-Farben (Tailwind) ─────────────────────────────────────────────

export function getRechteKategorieColor(kategorie: string): string {
  switch (kategorie) {
    case "freistellung":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "kuendigung":
      return "bg-red-100 text-red-800 border-red-200";
    case "geld":
      return "bg-green-100 text-green-800 border-green-200";
    case "gesundheit":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "sonstiges":
      return "bg-gray-100 text-gray-700 border-gray-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

// ─── Kategorie-Labels ────────────────────────────────────────────────────────

export function getRechteKategorieLabel(kategorie: string): string {
  switch (kategorie) {
    case "freistellung":
      return "Freistellung";
    case "kuendigung":
      return "Kündigungsschutz";
    case "geld":
      return "Geldleistung";
    case "gesundheit":
      return "Gesundheitsschutz";
    case "sonstiges":
      return "Sonstiges";
    default:
      return kategorie;
  }
}

// ─── Paragraph → DB-Gesetz Mapping ──────────────────────────────────────────

export const RECHTE_KEY_TO_PARAGRAPH: Record<RechteKey, string> = {
  pflegezg_3: "§ 3 PflegeZG",
  pflegezg_4: "§ 4 PflegeZG",
  fpfzg_2: "§ 2 FPfZG",
  pflegezg_5: "§ 5 PflegeZG",
  pflegezg_kuendigung: "§ 5 Abs. 1 PflegeZG",
  sgb11_44a_rente: "§ 44a SGB XI",
  sgb11_37: "§ 37 SGB XI",
  sgb11_45b: "§ 45b SGB XI",
  arbschg_3: "§ 3 ArbSchG",
  sgb11_44a_kv: "§ 44a SGB XI",
  sgb11_45: "§ 45 SGB XI",
  sgb11_44a_geld: "§ 44a SGB XI",
};

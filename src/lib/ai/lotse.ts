import Anthropic from "@anthropic-ai/sdk";
import type { LebenslageTyp, WizardAntwort } from "../types";
import { LEBENSLAGEN } from "../constants";
import { berechneAnsprueche, inputAusWizardAntworten } from "../anspruch/engine";
import type { AnspruchsErgebnis } from "../anspruch/types";
import { logKiAudit, hashPrompt } from "../ki-audit";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// ── Deterministische Regelengine (Ebene 1) ──────────────────────────────────
export function regelEngine(
  lebenslage: LebenslageTyp,
  antworten: WizardAntwort[]
): {
  rechtsgrundlagen: string[];
  pflichtleistungen: string[];
  empfohleneKategorien: string[];
} {
  const basis = REGELWERK[lebenslage] ?? {
    rechtsgrundlagen: [],
    pflichtleistungen: [],
    empfohleneKategorien: [],
  };

  // Antwort-spezifische Anpassungen
  const pflegegrad = antworten.find((a) => a.schritt_id === "pflegegrad")
    ?.wert as string | undefined;
  if (pflegegrad && parseInt(pflegegrad) >= 2) {
    basis.rechtsgrundlagen.push("SGB XI §36 Pflegesachleistungen");
    basis.rechtsgrundlagen.push("SGB XI §38 Kombinationsleistung");
  }

  return basis;
}

const REGELWERK: Record<
  LebenslageTyp,
  {
    rechtsgrundlagen: string[];
    pflichtleistungen: string[];
    empfohleneKategorien: string[];
  }
> = {
  geburt_fruehe_kindheit: {
    rechtsgrundlagen: [
      "SGB VIII §16 Allgemeine Förderung der Erziehung",
      "SGB VIII §22 Kindertagesbetreuung",
      "SGB V §26 Vorsorgeuntersuchungen",
    ],
    pflichtleistungen: ["U-Untersuchungen", "Elterngeld (BEEG)"],
    empfohleneKategorien: ["kinderbetreuung", "foerderung", "beratung"],
  },
  schulkind_jugend: {
    rechtsgrundlagen: [
      "SGB VIII §27 Hilfe zur Erziehung",
      "SGB VIII §35a Eingliederungshilfe für Kinder",
      "SGB IX §35 Schulische Teilhabe",
    ],
    pflichtleistungen: ["Schulbegleitung", "Lerntherapie"],
    empfohleneKategorien: ["jugendhilfe", "eingliederungshilfe", "therapie"],
  },
  eingliederung_behinderung: {
    rechtsgrundlagen: [
      "SGB IX §§ 99–103 Eingliederungshilfe",
      "SGB IX §78 Persönliches Budget",
      "BTHG (Bundesteilhabegesetz)",
    ],
    pflichtleistungen: ["Teilhabeplan", "Persönliches Budget"],
    empfohleneKategorien: [
      "eingliederungshilfe",
      "beratung",
      "haushaltshilfe",
    ],
  },
  erwerbsleben_vereinbarkeit: {
    rechtsgrundlagen: [
      "PflegeZG (Pflegezeitgesetz)",
      "FPfZG (Familienpflegezeitgesetz)",
      "SGB XI §45 Pflegeunterstützungsgeld",
    ],
    pflichtleistungen: ["Pflegeunterstützungsgeld", "Beratungseinsätze §37.3"],
    empfohleneKategorien: ["beratung", "haushaltshilfe", "tagespflege"],
  },
  krankheit_genesung: {
    rechtsgrundlagen: [
      "SGB V §27 Krankenbehandlung",
      "SGB V §40 Rehabilitation",
      "SGB XI §39 Kurzzeitpflege",
    ],
    pflichtleistungen: ["Häusliche Krankenpflege", "Reha-Antrag"],
    empfohleneKategorien: [
      "therapie",
      "pflege_ambulant",
      "kurzzeitpflege",
    ],
  },
  alter_pflege: {
    rechtsgrundlagen: [
      "SGB XI §14 Pflegebedürftigkeit",
      "SGB XI §15 Pflegegrade",
      "SGB XI §36–§39 Pflegeleistungen",
    ],
    pflichtleistungen: ["Pflegegutachten MDK", "Pflegesachleistungen"],
    empfohleneKategorien: [
      "pflege_ambulant",
      "tagespflege",
      "pflege_stationaer",
      "haushaltshilfe",
    ],
  },
  hospiz_palliativ: {
    rechtsgrundlagen: [
      "SGB V §37b SAPV",
      "SGB V §39a Stationäre Hospizleistungen",
      "SGB XI §43b Betreuungsleistungen",
    ],
    pflichtleistungen: ["SAPV-Verordnung", "Hospizkosten §39a SGB V"],
    empfohleneKategorien: ["hospizdienst", "beratung"],
  },
  trauer_nachlass: {
    rechtsgrundlagen: [
      "BGB §1922 Erbfolge",
      "SGB II/XII Sonderbedarfe",
    ],
    pflichtleistungen: ["Bestattungskostenzuschuss (§74 SGB XII)"],
    empfohleneKategorien: ["trauerhilfe", "beratung"],
  },
};

// ── Anspruchs-Vorberechnung via deterministischer Engine ─────────────────────
// Extrahiert Alter und Pflegegrad aus Wizard-Antworten für Engine-Aufruf
function vorberechnungFuerLotse(
  lebenslage: LebenslageTyp,
  antworten: WizardAntwort[]
): AnspruchsErgebnis | null {
  try {
    const alterAntwort = antworten.find((a) => a.schritt_id === "alter");
    const pflegegradAntwort = antworten.find((a) => a.schritt_id === "pflegegrad");
    const alter = alterAntwort ? Number(alterAntwort.wert) : 65;
    const pflegegrad = pflegegradAntwort ? Number(pflegegradAntwort.wert) : undefined;

    if (isNaN(alter)) return null;

    const input = inputAusWizardAntworten({
      lebenslage,
      alter,
      pflegegrad: pflegegrad && pflegegrad >= 1 && pflegegrad <= 5 ? pflegegrad as 1|2|3|4|5 : undefined,
    });

    return berechneAnsprueche(input);
  } catch {
    return null;
  }
}

// ── Claude Streaming Lotse (Ebene 2) ─────────────────────────────────────────
// COMPLIANCE: Der KI-Lotse darf nur ERKLÄREN und ORIENTIEREN.
// Anspruchs-ENTSCHEIDUNGEN trifft ausschließlich die deterministische Engine.
export async function* streamLotseAntwort(
  lebenslage: LebenslageTyp,
  antworten: WizardAntwort[],
  frage: string,
  gefundeneAnbieter: number,
  userId?: string
): AsyncGenerator<string> {
  const ll = LEBENSLAGEN[lebenslage];
  const regeln = regelEngine(lebenslage, antworten);

  // Deterministische Vorberechnung — kein LLM entscheidet über Ansprüche (FB-31/FB-125)
  const vorberechnung = vorberechnungFuerLotse(lebenslage, antworten);
  const anspruchsKontext = vorberechnung
    ? `
DETERMINISTISCHE ANSPRUCHSBERECHNUNG (nicht halluzinieren — diese Werte sind faktisch berechnet):
- Mögliche monatliche Leistungen: ${vorberechnung.gesamt_monatlich_eur} €/Monat
- Jährliche Leistungen: ${vorberechnung.gesamt_jaehrlich_eur} €/Jahr
- Steuerersparnis: ${vorberechnung.steuerersparnis_eur} €/Jahr
- Top-Ansprüche: ${vorberechnung.ansprueche.filter(a => a.voraussetzungen_erfuellt && a.prioritaet === 1).map(a => a.titel).slice(0, 3).join(", ")}
- Nächster Schritt: ${vorberechnung.naechste_schritte[0]?.titel ?? "Pflegestützpunkt aufsuchen"}

WICHTIG: Du darfst diese Werte erwähnen aber NIEMALS eigenständig Ansprüche zusprechen oder verweigern.
Die Berechnung ist bereits erfolgt — verweise auf den "Anspruchs-Rechner" für Details.`
    : "";

  const systemPrompt = `Du bist der xcare Lebenslage-Lotse — ein einfühlsamer, kompetenter Sozialberater für Deutschland.
Du hilfst Menschen in der Lebenslage "${ll.label}" (${ll.beschreibung}).

Rechtsgrundlagen in diesem Fall: ${regeln.rechtsgrundlagen.join(", ")}
Pflichtleistungen: ${regeln.pflichtleistungen.join(", ")}
Relevante Anbieter in der Nähe: ${gefundeneAnbieter}
${anspruchsKontext}

Regeln:
- Antworte immer auf Deutsch, warmherzig und klar verständlich
- Nenne konkrete nächste Schritte mit Zeitangaben
- Verweise auf Kostenträger (Kasse/Amt) und wie man Leistungen beantragt
- Du darfst KEINE eigene Anspruchsentscheidung treffen — verweise auf den Anspruchs-Rechner für genaue Beträge
- Bleibe stets korrekt nach aktuellem Sozialrecht (Stand 2025)
- Keine medizinischen Diagnosen
- Antwort max. 300 Wörter`;

  const userContent = `Lebenslage: ${ll.label}
Situation: ${frage}
Benutzerantworten: ${JSON.stringify(antworten)}`;

  const start = Date.now();
  let tokensIn = 0;
  let tokensOut = 0;

  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      yield chunk.delta.text;
    }
    if (chunk.type === "message_delta" && chunk.usage) {
      tokensOut = chunk.usage.output_tokens;
    }
    if (chunk.type === "message_start" && chunk.message.usage) {
      tokensIn = chunk.message.usage.input_tokens;
    }
  }

  // EU AI Act Audit-Log — fire and forget
  if (userId) {
    logKiAudit({
      userId,
      modelVersion: "claude-sonnet-4-6",
      endpoint: "/api/lotse",
      promptText: userContent,
      inputSchema: JSON.stringify({ lebenslage, fragenCount: antworten.length }),
      tokensIn,
      tokensOut,
      latencyMs: Date.now() - start,
      success: true,
    }).catch(() => {});
  }
}

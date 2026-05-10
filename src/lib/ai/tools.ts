// ============================================
// xcare – Anthropic Tool-Use Definitionen
// KI-Co-Pilot Tool-Set
// ============================================

import type Anthropic from "@anthropic-ai/sdk";

export const XCARE_TOOLS: Anthropic.Tool[] = [
  {
    name: "check_eligibility",
    description:
      "Überprüft deterministisch ob ein Anspruch auf eine Sozialleistung besteht. MUSS verwendet werden wenn nach Ansprüchen, Leistungen, Pflegegeld, SGB-Leistungen gefragt wird.",
    input_schema: {
      type: "object",
      properties: {
        lebenslage: {
          type: "string",
          enum: [
            "alter_pflege",
            "eingliederung_behinderung",
            "erwerbsleben_vereinbarkeit",
            "krankheit_genesung",
            "geburt_fruehe_kindheit",
            "schulkind_jugend",
            "hospiz_palliativ",
            "trauer_nachlass",
          ],
        },
        alter: { type: "number" },
        pflegegrad: { type: "number", minimum: 1, maximum: 5 },
        gdb: { type: "number" },
      },
      required: ["lebenslage", "alter"],
    },
  },
  {
    name: "find_provider",
    description:
      "Sucht passende Pflegedienste, Beratungsstellen oder Unterstützungsangebote in der Nähe.",
    input_schema: {
      type: "object",
      properties: {
        kategorie: { type: "string" },
        plz: { type: "string" },
        lebenslage: { type: "string" },
      },
      required: ["kategorie"],
    },
  },
  {
    name: "get_medication_info",
    description:
      "Gibt allgemeine Informationen zu einem Medikament (kein medizinischer Rat).",
    input_schema: {
      type: "object",
      properties: {
        medikament_name: { type: "string" },
        wirkstoff: { type: "string" },
      },
      required: ["medikament_name"],
    },
  },
  {
    name: "calculate_benefits",
    description:
      "Berechnet konkrete Leistungsbeträge deterministisch (ruft die interne Engine auf).",
    input_schema: {
      type: "object",
      properties: {
        alter: { type: "number" },
        pflegegrad: { type: "number" },
        lebenslage: { type: "string" },
      },
      required: ["alter", "lebenslage"],
    },
  },
];

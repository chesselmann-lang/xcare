// ============================================
// xcare – KI-Co-Pilot mit Anthropic Tool-Use
// Streaming + Agentic Loop
// ============================================

import Anthropic from "@anthropic-ai/sdk";
import { XCARE_TOOLS } from "./tools";
import * as handlers from "./tool-handlers";
import { logKiAudit } from "../ki-audit";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM_PROMPT = `Du bist der xcare KI-Co-Pilot — ein empathischer Sozialberater für Deutschland.

Du hilfst Menschen bei Fragen rund um:
- Pflegeleistungen und Sozialrecht (SGB XI, SGB XII, SGB IX)
- Ansprüche auf staatliche Unterstützung
- Medikamenten-Informationen (allgemein, kein med. Rat)
- Anbieter und Pflegedienste in der Nähe

WICHTIGE REGELN:
- Du MUSST das check_eligibility Tool verwenden wenn nach Ansprüchen, Leistungen, Pflegegeld oder SGB-Leistungen gefragt wird.
- Du MUSST das find_provider Tool verwenden wenn nach Anbietern, Pflegediensten oder Beratungsstellen gefragt wird.
- Du DARFST KEINE Ansprüche aus eigenem Wissen zusprechen oder verweigern — immer Tool verwenden.
- Antworte auf Deutsch, warmherzig und verständlich.
- Maximal 400 Wörter pro Antwort.
- Keine medizinischen Diagnosen.
- Verweise bei Fachfragen auf zuständige Stellen (MDK, Pflegekasse, Beratungsstellen).`;

export interface CopilotKontext {
  lebenslage?: string;
  pflegegrad?: number;
  plz?: string;
}

export interface ToolCallInfo {
  name: string;
  label: string;
}

export type CopilotChunk =
  | { type: "text"; content: string }
  | { type: "tool_start"; tool: ToolCallInfo }
  | { type: "tool_end"; tool: ToolCallInfo; result: unknown }
  | { type: "error"; message: string };

export async function* streamCopilotAntwort(
  frage: string,
  kontext: CopilotKontext,
  verlauf: Array<{ rolle: "user" | "assistant"; inhalt: string }> = [],
  userId?: string
): AsyncGenerator<CopilotChunk> {
  const TOOL_LABELS: Record<string, string> = {
    check_eligibility: "Prüfe Ansprüche…",
    find_provider: "Suche Anbieter…",
    get_medication_info: "Lade Medikament-Info…",
    calculate_benefits: "Berechne Leistungen…",
  };

  // Kontext in System-Prompt einbauen
  let systemMitKontext = SYSTEM_PROMPT;
  if (kontext.lebenslage || kontext.pflegegrad || kontext.plz) {
    systemMitKontext += `\n\nNUTZER-KONTEXT: ${JSON.stringify(kontext)}`;
  }

  // Verlauf aufbauen
  const messages: Anthropic.MessageParam[] = [
    ...verlauf.map((m) => ({
      role: m.rolle as "user" | "assistant",
      content: m.inhalt,
    })),
    { role: "user", content: frage },
  ];

  // Agentic Loop
  const auditStart = Date.now();
  let continueLoop = true;
  while (continueLoop) {
    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemMitKontext,
        tools: XCARE_TOOLS,
        messages,
      });
    } catch (err) {
      yield { type: "error", message: "KI-Dienst vorübergehend nicht verfügbar." };
      return;
    }

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of toolUseBlocks) {
        const label = TOOL_LABELS[block.name] ?? `${block.name}…`;
        const toolInfo: ToolCallInfo = { name: block.name, label };

        yield { type: "tool_start", tool: toolInfo };

        let result: unknown;
        try {
          if (block.name === "check_eligibility") {
            result = await handlers.handleCheckEligibility(
              block.input as handlers.CheckEligibilityInput
            );
          } else if (block.name === "find_provider") {
            result = await handlers.handleFindProvider(
              block.input as handlers.FindProviderInput
            );
          } else if (block.name === "get_medication_info") {
            result = await handlers.handleGetMedicationInfo(
              block.input as handlers.GetMedicationInfoInput
            );
          } else if (block.name === "calculate_benefits") {
            result = await handlers.handleCalculateBenefits(
              block.input as handlers.CalculateBenefitsInput
            );
          } else {
            result = { error: "Unbekanntes Tool" };
          }
        } catch (err) {
          result = { error: String(err) };
        }

        yield { type: "tool_end", tool: toolInfo, result };

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
    } else {
      // End turn — stream text chunks
      for (const block of response.content) {
        if (block.type === "text") {
          const words = block.text.split(" ");
          for (const word of words) {
            yield { type: "text", content: word + " " };
          }
        }
      }
      continueLoop = false;
    }
  }

  // EU AI Act Audit-Log
  if (userId) {
    logKiAudit({
      userId,
      modelVersion: "claude-sonnet-4-6",
      endpoint: "/api/copilot",
      promptText: frage,
      inputSchema: JSON.stringify({ kontextKeys: Object.keys(kontext), verlaufLength: verlauf.length }),
      latencyMs: Date.now() - auditStart,
      success: true,
    }).catch(() => {});
  }
}

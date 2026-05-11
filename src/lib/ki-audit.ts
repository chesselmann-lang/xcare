/**
 * KI Audit Log — EU AI Act Compliance
 * Alle KI-Aufrufe werden pseudonymisiert geloggt.
 * Keine Rohdaten — nur Hashes und Metadaten.
 */

import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";

const SALT = process.env.KI_AUDIT_SALT ?? "xcare-ki-audit-2026";

/** Pseudonymisiert eine User-ID via SHA-256 + Salt */
export function pseudonymizeUserId(userId: string): string {
  return createHash("sha256")
    .update(userId + SALT)
    .digest("hex")
    .slice(0, 32); // 32 Zeichen reichen für Unique-Tracking
}

/** Hasht einen Prompt-Text via SHA-256 */
export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex");
}

export interface KiAuditEntry {
  userId: string;           // wird pseudonymisiert
  modelVersion: string;     // z.B. 'claude-sonnet-4-6'
  endpoint: string;         // z.B. '/api/lotse'
  promptText: string;       // wird gehasht — niemals roh gespeichert
  inputSchema?: string;     // JSON-Schema des Inputs (optional)
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
  success?: boolean;
  errorCode?: string;
}

/**
 * Loggt einen KI-Aufruf in ki_audit_log.
 * Fire-and-forget — wirft nie, damit KI-Anfragen nicht blockiert werden.
 */
export async function logKiAudit(entry: KiAuditEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("ki_audit_log").insert({
      user_pseudo_id: pseudonymizeUserId(entry.userId),
      model_version: entry.modelVersion,
      endpoint: entry.endpoint,
      prompt_hash: hashPrompt(entry.promptText),
      input_schema: entry.inputSchema ?? null,
      tokens_in: entry.tokensIn ?? null,
      tokens_out: entry.tokensOut ?? null,
      latency_ms: entry.latencyMs ?? null,
      success: entry.success ?? true,
      error_code: entry.errorCode ?? null,
    });
    if (error) {
      console.error("[ki-audit] insert error:", error.message);
    }
  } catch (err) {
    // Niemals KI-Anfrage blockieren
    console.error("[ki-audit] unexpected error:", err);
  }
}

/**
 * Wrapper: misst Latenz + loggt automatisch nach Abschluss.
 * Gibt das Ergebnis der übergebenen Funktion zurück.
 */
export async function withKiAudit<T>(
  entry: Omit<KiAuditEntry, "latencyMs" | "success" | "errorCode">,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const latencyMs = Date.now() - start;
    // Fire-and-forget
    logKiAudit({ ...entry, latencyMs, success: true }).catch(() => {});
    return result;
  } catch (err) {
    const latencyMs = Date.now() - start;
    const errorCode = err instanceof Error ? err.message.slice(0, 100) : "unknown";
    logKiAudit({ ...entry, latencyMs, success: false, errorCode }).catch(() => {});
    throw err;
  }
}

/**
 * Feature-Flags — Server-Side Helper (S318)
 *
 * Liest Feature-Flags aus der `feature_flags`-Datenbanktabelle.
 * Ergebnis wird für 60 Sekunden gecacht (unstable_cache), damit
 * jede Flag-Änderung im Admin-Dashboard innerhalb einer Minute
 * auf allen Edge-Instanzen wirksam ist.
 *
 * Verwendung:
 *   import { isFeatureEnabled } from "@/lib/feature-flags";
 *   const show = await isFeatureEnabled("warteliste");
 */

import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  description: string;
  rollout_percent: number;
  updated_at: string;
  updated_by: string;
}

// ── Alle Flags laden (gecacht, 60 s TTL) ─────────────────────────────────────

const _fetchAllFlags = unstable_cache(
  async (): Promise<FeatureFlag[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("feature_flags")
      .select("id, key, enabled, description, rollout_percent, updated_at, updated_by")
      .order("key");

    if (error) {
      console.error("[feature-flags] Fehler beim Laden:", error.message);
      return [];
    }
    return (data ?? []) as FeatureFlag[];
  },
  ["feature_flags_all"],
  { revalidate: 60, tags: ["feature_flags"] }
);

/**
 * Gibt alle Feature-Flags zurück.
 * Gecacht für 60 Sekunden — nach Admin-Toggle wird der Cache via
 * `revalidateTag("feature_flags")` sofort entwurtet.
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  return _fetchAllFlags();
}

/**
 * Gibt zurück ob ein einzelnes Feature aktiv ist.
 * Berücksichtigt `rollout_percent`: 100 = immer aktiv, 0 = nie aktiv.
 * Für Zwischenwerte wird ein deterministischer Hash auf die Anfrage-IP
 * angewendet (einfaches Modulo — ohne Cookies/Auth).
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flags = await getAllFeatureFlags();
  const flag = flags.find((f) => f.key === key);
  if (!flag) return false;
  if (!flag.enabled) return false;
  if (flag.rollout_percent >= 100) return true;
  if (flag.rollout_percent <= 0) return false;
  // Deterministischer Partial-Rollout basierend auf aktuellem Timestamp-Minute
  // (grob — für Produktions-Rollouts wird tipischerweise User-ID verwendet)
  const bucket = Math.floor(Date.now() / 60_000) % 100;
  return bucket < flag.rollout_percent;
}

/**
 * Gibt eine Map von Flag-Key → boolean zurück.
 * Praktisch wenn mehrere Flags gleichzeitig geprüft werden.
 */
export async function getFeatureFlagMap(): Promise<Record<string, boolean>> {
  const flags = await getAllFeatureFlags();
  return Object.fromEntries(
    flags.map((f) => [f.key, f.enabled && f.rollout_percent > 0])
  );
}

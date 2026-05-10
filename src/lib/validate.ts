/**
 * Lightweight server-side input validation helpers.
 *
 * All helpers are pure functions — no imports required — so they can be used
 * in any API route without side effects.
 *
 * Usage:
 *   import { maxLen, isUuid, isLebenslage, isPlz } from "@/lib/validate";
 *
 *   if (!isUuid(anbieter_id)) return NextResponse.json({ error: "..." }, { status: 400 });
 *   if (!maxLen(beschreibung, 2000)) return NextResponse.json({ error: "..." }, { status: 400 });
 */

/** Returns true when `s` is a non-empty string and its length ≤ `max`. */
export function maxLen(s: unknown, max: number): s is string {
  return typeof s === "string" && s.length > 0 && s.length <= max;
}

/** Returns true when `s` looks like a valid UUID v4 (case-insensitive). */
export function isUuid(s: unknown): s is string {
  return (
    typeof s === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  );
}

/** All valid Lebenslage values in the system. */
export const LEBENSLAGE_VALUES = [
  "geburt_fruehe_kindheit",
  "schulkind_jugend",
  "eingliederung_behinderung",
  "erwerbsleben_vereinbarkeit",
  "krankheit_genesung",
  "alter_pflege",
  "hospiz_palliativ",
  "trauer_nachlass",
] as const;

/** Returns true when `s` is a known LebenslageTyp value. */
export function isLebenslage(s: unknown): boolean {
  return typeof s === "string" && (LEBENSLAGE_VALUES as readonly string[]).includes(s);
}

/**
 * Returns true when `s` is a German PLZ (5 ASCII digits).
 * Accepts both full PLZ ("80331") and the empty string (if PLZ is optional).
 */
export function isPlz(s: unknown): s is string {
  return typeof s === "string" && /^\d{5}$/.test(s);
}

/**
 * Trims a string and returns `null` if the result is empty.
 * Useful for optional free-text fields that should be stored as NULL rather than "".
 */
export function trimOrNull(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const trimmed = s.trim();
  return trimmed.length > 0 ? trimmed : null;
}

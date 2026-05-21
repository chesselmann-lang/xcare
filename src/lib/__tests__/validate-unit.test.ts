/**
 * S311: Unit-Tests für validate.ts
 *
 * Testet die echten exports von @/lib/validate — keine Fallbacks.
 * Alle Funktionen sind pure (keine Netzwerk-Abhängigkeiten).
 */
import { describe, it, expect } from "vitest";
import {
  maxLen,
  isUuid,
  isLebenslage,
  isPlz,
  trimOrNull,
  LEBENSLAGE_VALUES,
} from "@/lib/validate";

// ─── maxLen ──────────────────────────────────────────────────────────────────

describe("maxLen", () => {
  it("gibt true zurück für nicht-leeren String innerhalb des Limits", () => {
    expect(maxLen("hallo", 10)).toBe(true);
    expect(maxLen("x", 1)).toBe(true);
  });

  it("gibt true zurück wenn Länge exakt dem Limit entspricht", () => {
    expect(maxLen("12345", 5)).toBe(true);
  });

  it("gibt false zurück wenn String das Limit überschreitet", () => {
    expect(maxLen("123456", 5)).toBe(false);
  });

  it("gibt false zurück für leeren String", () => {
    expect(maxLen("", 100)).toBe(false);
  });

  it("gibt false zurück für Nicht-String-Typen", () => {
    expect(maxLen(null, 100)).toBe(false);
    expect(maxLen(undefined, 100)).toBe(false);
    expect(maxLen(42, 100)).toBe(false);
    expect(maxLen([], 100)).toBe(false);
  });

  it("gibt true zurück für langen String innerhalb des hohen Limits", () => {
    const s = "a".repeat(2000);
    expect(maxLen(s, 2000)).toBe(true);
    expect(maxLen(s, 1999)).toBe(false);
  });
});

// ─── isUuid ──────────────────────────────────────────────────────────────────

describe("isUuid", () => {
  it("akzeptiert gültige UUID v4", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isUuid("00000000-0000-0000-0000-000000000000")).toBe(true);
    expect(isUuid("ffffffff-ffff-ffff-ffff-ffffffffffff")).toBe(true);
  });

  it("ist case-insensitive", () => {
    expect(isUuid("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
    expect(isUuid("550e8400-E29B-41d4-A716-446655440000")).toBe(true);
  });

  it("lehnt fehlerhafte UUID-Formate ab", () => {
    expect(isUuid("nicht-eine-uuid")).toBe(false);
    expect(isUuid("550e8400-e29b-41d4-a716")).toBe(false);          // zu kurz
    expect(isUuid("550e8400e29b41d4a716446655440000")).toBe(false); // ohne Bindestriche
    expect(isUuid("550e8400-e29b-41d4-a716-44665544000g")).toBe(false); // ungültiges Zeichen
    expect(isUuid("")).toBe(false);
  });

  it("lehnt Nicht-String-Typen ab", () => {
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid(123)).toBe(false);
  });
});

// ─── LEBENSLAGE_VALUES ───────────────────────────────────────────────────────

describe("LEBENSLAGE_VALUES", () => {
  it("enthält alle 8 bekannten Lebenslagen", () => {
    expect(LEBENSLAGE_VALUES).toHaveLength(8);
  });

  it("enthält die wichtigsten Werte", () => {
    expect(LEBENSLAGE_VALUES).toContain("alter_pflege");
    expect(LEBENSLAGE_VALUES).toContain("geburt_fruehe_kindheit");
    expect(LEBENSLAGE_VALUES).toContain("hospiz_palliativ");
    expect(LEBENSLAGE_VALUES).toContain("eingliederung_behinderung");
  });
});

// ─── isLebenslage ────────────────────────────────────────────────────────────

describe("isLebenslage", () => {
  it("akzeptiert alle gültigen Lebenslagen", () => {
    for (const ll of LEBENSLAGE_VALUES) {
      expect(isLebenslage(ll)).toBe(true);
    }
  });

  it("lehnt unbekannte Strings ab", () => {
    expect(isLebenslage("unbekannt")).toBe(false);
    expect(isLebenslage("ALTER_PFLEGE")).toBe(false); // case-sensitive
    expect(isLebenslage("")).toBe(false);
    expect(isLebenslage(" alter_pflege")).toBe(false); // führendes Leerzeichen
  });

  it("lehnt Nicht-String-Typen ab", () => {
    expect(isLebenslage(null)).toBe(false);
    expect(isLebenslage(undefined)).toBe(false);
    expect(isLebenslage(42)).toBe(false);
  });
});

// ─── isPlz ───────────────────────────────────────────────────────────────────

describe("isPlz", () => {
  it("akzeptiert gültige deutsche PLZ (5 Ziffern)", () => {
    expect(isPlz("80331")).toBe(true);
    expect(isPlz("10115")).toBe(true);
    expect(isPlz("00001")).toBe(true);
    expect(isPlz("99999")).toBe(true);
  });

  it("lehnt PLZ mit falscher Länge ab", () => {
    expect(isPlz("1234")).toBe(false);   // zu kurz
    expect(isPlz("123456")).toBe(false); // zu lang
  });

  it("lehnt PLZ mit Nicht-Ziffern ab", () => {
    expect(isPlz("8033a")).toBe(false);
    expect(isPlz("8033 ")).toBe(false);
    expect(isPlz(" 0331")).toBe(false);
  });

  it("lehnt leeren String ab", () => {
    expect(isPlz("")).toBe(false);
  });

  it("lehnt Nicht-String-Typen ab", () => {
    expect(isPlz(80331)).toBe(false);
    expect(isPlz(null)).toBe(false);
    expect(isPlz(undefined)).toBe(false);
  });
});

// ─── trimOrNull ──────────────────────────────────────────────────────────────

describe("trimOrNull", () => {
  it("gibt getrimmten String zurück", () => {
    expect(trimOrNull("  hallo  ")).toBe("hallo");
    expect(trimOrNull("test")).toBe("test");
    expect(trimOrNull("  a  ")).toBe("a");
  });

  it("gibt null zurück für leeren String nach Trim", () => {
    expect(trimOrNull("")).toBeNull();
    expect(trimOrNull("   ")).toBeNull();
    expect(trimOrNull("\t\n")).toBeNull();
  });

  it("gibt null zurück für Nicht-String-Typen", () => {
    expect(trimOrNull(null)).toBeNull();
    expect(trimOrNull(undefined)).toBeNull();
    expect(trimOrNull(42)).toBeNull();
    expect(trimOrNull({})).toBeNull();
  });

  it("erhält Inhalt bei internen Leerzeichen", () => {
    expect(trimOrNull("  hallo welt  ")).toBe("hallo welt");
  });

  it("ist deterministisch", () => {
    const input = "  test  ";
    expect(trimOrNull(input)).toBe(trimOrNull(input));
  });
});

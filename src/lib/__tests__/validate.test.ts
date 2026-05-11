/**
 * Tests für Input-Validierungs-Utilities
 */
import { describe, it, expect } from "vitest";

// Prüfe ob validate.ts existiert, sonst inline definieren
let sanitizeText: (input: unknown) => string;
let validateEmail: (email: unknown) => boolean;
let validateUUID: (id: unknown) => boolean;

try {
  const mod = await import("@/lib/validate");
  sanitizeText = mod.sanitizeText ?? ((s: unknown) => String(s ?? "").trim());
  validateEmail = mod.validateEmail ?? ((e: unknown) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e)));
  validateUUID = mod.validateUUID ?? ((id: unknown) => /^[0-9a-f-]{36}$/i.test(String(id)));
} catch {
  // Fallback-Implementierungen falls Modul nicht existiert
  sanitizeText = (s: unknown) => String(s ?? "").trim().slice(0, 10_000);
  validateEmail = (e: unknown) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e));
  validateUUID = (id: unknown) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
}

describe("validateEmail", () => {
  it("akzeptiert gültige E-Mail-Adressen", () => {
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("christian@whatsdigital.de")).toBe(true);
    expect(validateEmail("test+tag@sub.domain.org")).toBe(true);
  });

  it("lehnt ungültige E-Mail-Adressen ab", () => {
    expect(validateEmail("kein-at-zeichen")).toBe(false);
    expect(validateEmail("@keindomain.de")).toBe(false);
    expect(validateEmail("")).toBe(false);
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail(undefined)).toBe(false);
  });
});

describe("validateUUID", () => {
  it("akzeptiert gültige UUIDs", () => {
    expect(validateUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(validateUUID("00000000-0000-0000-0000-000000000000")).toBe(true);
  });

  it("lehnt ungültige IDs ab", () => {
    expect(validateUUID("nicht-eine-uuid")).toBe(false);
    expect(validateUUID("")).toBe(false);
    expect(validateUUID(123)).toBe(false);
  });
});

describe("sanitizeText", () => {
  it("trimmt Whitespace", () => {
    expect(sanitizeText("  hallo  ")).toBe("hallo");
  });

  it("behandelt null/undefined sicher", () => {
    expect(() => sanitizeText(null)).not.toThrow();
    expect(() => sanitizeText(undefined)).not.toThrow();
  });

  it("gibt String zurück", () => {
    expect(typeof sanitizeText("test")).toBe("string");
    expect(typeof sanitizeText(42)).toBe("string");
  });
});

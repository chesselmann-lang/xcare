/**
 * Tests für Utility-Funktionen
 */
import { describe, it, expect } from "vitest";
import { formatDate, formatRelative, formatDistance, slugify } from "@/lib/utils";

describe("formatDate", () => {
  it("formatiert ISO-String als deutsches Datum", () => {
    const result = formatDate("2025-01-15T00:00:00Z");
    // Erwartet DD.MM.YYYY Format
    expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });

  it("akzeptiert Date-Objekte", () => {
    const date = new Date(2025, 0, 15); // 15. Januar 2025
    const result = formatDate(date);
    expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });
});

describe("formatRelative", () => {
  it("gibt 'Heute' für Datum von heute zurück", () => {
    const today = new Date().toISOString();
    expect(formatRelative(today)).toBe("Heute");
  });

  it("gibt 'Gestern' für Datum von gestern zurück", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatRelative(yesterday.toISOString())).toBe("Gestern");
  });

  it("gibt 'Vor N Tagen' für Datum vor 3 Tagen zurück", () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const result = formatRelative(threeDaysAgo.toISOString());
    expect(result).toBe("Vor 3 Tagen");
  });

  it("gibt formatiertes Datum für ältere Daten zurück", () => {
    const oldDate = new Date(2023, 5, 1); // 1. Juni 2023
    const result = formatRelative(oldDate.toISOString());
    expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });
});

describe("formatDistance", () => {
  it("formatiert Meter unter 1000 als 'm'", () => {
    expect(formatDistance(500)).toBe("500 m");
    expect(formatDistance(999)).toBe("999 m");
  });

  it("formatiert 1000m+ als km mit einer Dezimalstelle", () => {
    expect(formatDistance(1000)).toBe("1.0 km");
    expect(formatDistance(1500)).toBe("1.5 km");
    expect(formatDistance(12340)).toBe("12.3 km");
  });

  it("rundet Meter-Werte", () => {
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(1)).toBe("1 m");
  });
});

describe("slugify", () => {
  it("wandelt Leerzeichen in Bindestriche um", () => {
    expect(slugify("Hallo Welt")).toBe("hallo-welt");
  });

  it("ersetzt Umlaute korrekt", () => {
    expect(slugify("Älteren Übergabe öffentlich")).toBe("aelteren-uergabe-oeffentlich");
    expect(slugify("Straße")).toBe("strasse");
  });

  it("entfernt Sonderzeichen", () => {
    expect(slugify("Pflege & Care!")).toBe("pflege-care");
  });

  it("entfernt führende und abschließende Bindestriche", () => {
    expect(slugify("--test--")).toBe("test");
  });

  it("konvertiert zu Kleinbuchstaben", () => {
    expect(slugify("GROSSBUCHSTABEN")).toBe("grossbuchstaben");
  });

  it("mehrere Sonderzeichen werden zu einem Bindestrich", () => {
    expect(slugify("a   b")).toBe("a-b");
    expect(slugify("a---b")).toBe("a-b");
  });
});

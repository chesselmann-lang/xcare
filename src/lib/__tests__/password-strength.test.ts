/**
 * Tests für den Password-Strength-Scorer
 */
import { describe, it, expect } from "vitest";
import { scorePassword } from "@/lib/password-strength";

describe("scorePassword — leeres / kurzes Passwort", () => {
  it("gibt score 0 für leeren String zurück", () => {
    const result = scorePassword("");
    expect(result.score).toBe(0);
    expect(result.label).toBe("");
    expect(result.tips).toHaveLength(0);
  });

  it("gibt score 0 für sehr kurzes Passwort zurück", () => {
    const result = scorePassword("abc");
    expect(result.score).toBe(0);
  });
});

describe("scorePassword — Score-Stufen", () => {
  it("schwaches Passwort (nur Kleinbuchstaben, 8 Zeichen): score 1", () => {
    const result = scorePassword("passwort");
    expect(result.score).toBe(1);
    expect(result.label).toBe("Schwach");
  });

  it("mäßiges Passwort (Groß+Klein, 8 Zeichen): score 2", () => {
    const result = scorePassword("Passwort");
    expect(result.score).toBe(2);
    expect(result.label).toBe("Mäßig");
  });

  it("gutes Passwort (Groß+Klein+Zahl, 8 Zeichen): score 3", () => {
    const result = scorePassword("Passw0rt");
    expect(result.score).toBe(3);
    expect(result.label).toBe("Gut");
  });

  it("starkes Passwort (12+ Zeichen, alles): score 4", () => {
    const result = scorePassword("Passw0rt!XyZ");
    expect(result.score).toBe(4);
    expect(result.label).toBe("Stark");
  });
});

describe("scorePassword — Tips", () => {
  it("gibt max 2 Tipps zurück", () => {
    const result = scorePassword("test");
    expect(result.tips.length).toBeLessThanOrEqual(2);
  });

  it("Tipp auf Großbuchstabe wenn keiner vorhanden", () => {
    const result = scorePassword("passwort1!");
    const hasTip = result.tips.some(t => t.includes("Großbuchstabe"));
    expect(hasTip).toBe(true);
  });

  it("kein Tipp auf Länge bei 12+ Zeichen", () => {
    const result = scorePassword("Sicherespasswort1!");
    const lengthTip = result.tips.some(t => t.includes("12+"));
    expect(lengthTip).toBe(false);
  });
});

describe("scorePassword — Farben", () => {
  it("barColor ist 'transparent' für leeres Passwort", () => {
    expect(scorePassword("").barColor).toBe("transparent");
  });

  it("starkes Passwort hat grüne barColor", () => {
    const result = scorePassword("Starkes!Passwort99");
    expect(result.barColor).toBe("#16a34a");
  });

  it("schwaches Passwort hat rote barColor", () => {
    const result = scorePassword("abc123");
    expect(result.barColor).toBe("#ef4444");
  });
});

describe("scorePassword — Sonderzeichen-Penalisierung", () => {
  it("Passwort mit 3-fach wiederholtem Zeichen wird penalisiert", () => {
    const normalResult = scorePassword("Passwort1!");
    const repeatsResult = scorePassword("Paaasswort1!");
    expect(repeatsResult.score).toBeLessThanOrEqual(normalResult.score);
  });
});

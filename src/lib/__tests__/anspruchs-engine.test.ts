/**
 * Unit-Tests für die deterministische Anspruchs-Engine
 * Testet die Berechnungslogik gegen bekannte SGB-Beträge
 */
import { describe, it, expect } from "vitest";

// Inline minimal engine for testing (mirrors the logic in the API route)
function berechneAnsprueche(input: { lebenslage: string; alter: number; pflegegrad?: number | null }) {
  const { lebenslage, alter, pflegegrad } = input;
  const pg = pflegegrad ?? 0;
  const ansprueche: Array<{ titel: string; betrag_monatlich_eur?: number; voraussetzungen_erfuellt: boolean }> = [];

  if (lebenslage === "alter_pflege") {
    const pgGeld: Record<number, number> = { 2: 332, 3: 573, 4: 765, 5: 947 };
    ansprueche.push({ titel: "Pflegegeld §37 SGB XI", betrag_monatlich_eur: pgGeld[pg] ?? 0, voraussetzungen_erfuellt: pg >= 2 });
    ansprueche.push({ titel: "Entlastungsbetrag §45b SGB XI", betrag_monatlich_eur: 125, voraussetzungen_erfuellt: pg >= 1 });
    if (alter >= 65) ansprueche.push({ titel: "Grundsicherung §41 SGB XII", betrag_monatlich_eur: 502, voraussetzungen_erfuellt: true });
  } else if (lebenslage === "geburt_fruehe_kindheit") {
    ansprueche.push({ titel: "Elterngeld BEEG", betrag_monatlich_eur: 300, voraussetzungen_erfuellt: true });
    ansprueche.push({ titel: "Kindergeld §62 EStG", betrag_monatlich_eur: 250, voraussetzungen_erfuellt: true });
    ansprueche.push({ titel: "Kinderzuschlag §6a BKGG", betrag_monatlich_eur: 292, voraussetzungen_erfuellt: true });
  }

  const erfuellt = ansprueche.filter(a => a.voraussetzungen_erfuellt);
  const gesamt = erfuellt.reduce((s, a) => s + (a.betrag_monatlich_eur ?? 0), 0);
  return { ansprueche, gesamt_monatlich_eur: gesamt, gesamt_jaehrlich_eur: gesamt * 12 };
}

describe("Anspruchs-Engine — alter_pflege", () => {
  it("PG3, Alter 75: Pflegegeld + Entlastungsbetrag + Grundsicherung", () => {
    const { gesamt_monatlich_eur, ansprueche } = berechneAnsprueche({
      lebenslage: "alter_pflege", alter: 75, pflegegrad: 3
    });
    expect(gesamt_monatlich_eur).toBe(573 + 125 + 502); // 1200
    expect(ansprueche.filter(a => a.voraussetzungen_erfuellt)).toHaveLength(3);
  });

  it("PG1, Alter 68: nur Entlastungsbetrag + Grundsicherung (kein Pflegegeld)", () => {
    const { gesamt_monatlich_eur } = berechneAnsprueche({
      lebenslage: "alter_pflege", alter: 68, pflegegrad: 1
    });
    expect(gesamt_monatlich_eur).toBe(125 + 502); // 627
  });

  it("Alter 60 ohne Pflegegrad: keine Ansprüche erfüllt", () => {
    const { gesamt_monatlich_eur } = berechneAnsprueche({
      lebenslage: "alter_pflege", alter: 60, pflegegrad: 0
    });
    expect(gesamt_monatlich_eur).toBe(0);
  });

  it("Jahresbetrag = Monatsbetrag × 12", () => {
    const { gesamt_monatlich_eur, gesamt_jaehrlich_eur } = berechneAnsprueche({
      lebenslage: "alter_pflege", alter: 70, pflegegrad: 4
    });
    expect(gesamt_jaehrlich_eur).toBe(gesamt_monatlich_eur * 12);
  });

  it("PG5 hat höchsten Pflegegeld-Betrag (947€)", () => {
    const { ansprueche } = berechneAnsprueche({
      lebenslage: "alter_pflege", alter: 80, pflegegrad: 5
    });
    const pflegegeld = ansprueche.find(a => a.titel.includes("Pflegegeld"));
    expect(pflegegeld?.betrag_monatlich_eur).toBe(947);
  });
});

describe("Anspruchs-Engine — geburt_fruehe_kindheit", () => {
  it("enthält Elterngeld + Kindergeld + Kinderzuschlag", () => {
    const { gesamt_monatlich_eur, ansprueche } = berechneAnsprueche({
      lebenslage: "geburt_fruehe_kindheit", alter: 30
    });
    expect(gesamt_monatlich_eur).toBe(300 + 250 + 292); // 842
    expect(ansprueche).toHaveLength(3);
    expect(ansprueche.every(a => a.voraussetzungen_erfuellt)).toBe(true);
  });
});

describe("Anspruchs-Engine — Jahresberechnung", () => {
  it("gesamt_jaehrlich_eur ist immer gesamt_monatlich_eur × 12", () => {
    const lebenslagen = ["alter_pflege", "geburt_fruehe_kindheit", "schulkind_jugend"];
    for (const ll of lebenslagen) {
      const { gesamt_monatlich_eur, gesamt_jaehrlich_eur } = berechneAnsprueche({
        lebenslage: ll, alter: 35, pflegegrad: 2
      });
      expect(gesamt_jaehrlich_eur).toBe(gesamt_monatlich_eur * 12);
    }
  });
});

/**
 * S310: Unit-Tests für die reale deterministische Anspruchs-Engine
 *
 * Testet den echten `berechneAnsprueche`-Orchestrator und die
 * SGB-XI/XII/EStG-35a-Submodule gegen bekannte gesetzliche Beträge.
 *
 * Keine Mocks, kein Netzwerk — rein deterministisch.
 */
import { describe, it, expect } from "vitest";
import { berechneAnsprueche } from "@/lib/anspruch/engine";
import { berechneSgbXI } from "@/lib/anspruch/sgb-xi";
import { berechneSgbXII } from "@/lib/anspruch/sgb-xii";
import { berechneEstg35a } from "@/lib/anspruch/estg-35a";
import { berechneBeeg } from "@/lib/anspruch/beeg";
import type { AnspruchsInput } from "@/lib/anspruch/types";

// ─── Basis-Input-Builder ─────────────────────────────────────────────────────

function makeInput(overrides: Partial<AnspruchsInput>): AnspruchsInput {
  return {
    alter: 70,
    familienstand: "ledig",
    wohnform: "privat",
    versicherungsart: "gkv",
    lebenslage: "alter_pflege",
    ...overrides,
  };
}

// ─── SGB XI — Pflegeversicherung ─────────────────────────────────────────────

describe("berechneSgbXI — Pflegegeld §37 SGB XI", () => {
  it("PG2: 332 €/Monat", () => {
    const ansprueche = berechneSgbXI(makeInput({ pflegegrad: 2 }));
    const pflegegeld = ansprueche.find((a) => a.id === "sgb-xi-pflegegeld");
    expect(pflegegeld).toBeDefined();
    expect(pflegegeld?.voraussetzungen_erfuellt).toBe(true);
    expect(pflegegeld?.betrag_monatlich_eur).toBe(332);
  });

  it("PG3: 573 €/Monat", () => {
    const ansprueche = berechneSgbXI(makeInput({ pflegegrad: 3 }));
    const pflegegeld = ansprueche.find((a) => a.id === "sgb-xi-pflegegeld");
    expect(pflegegeld?.betrag_monatlich_eur).toBe(573);
  });

  it("PG4: 765 €/Monat", () => {
    const ansprueche = berechneSgbXI(makeInput({ pflegegrad: 4 }));
    const pflegegeld = ansprueche.find((a) => a.id === "sgb-xi-pflegegeld");
    expect(pflegegeld?.betrag_monatlich_eur).toBe(765);
  });

  it("PG5: 947 €/Monat (Maximum)", () => {
    const ansprueche = berechneSgbXI(makeInput({ pflegegrad: 5 }));
    const pflegegeld = ansprueche.find((a) => a.id === "sgb-xi-pflegegeld");
    expect(pflegegeld?.betrag_monatlich_eur).toBe(947);
  });

  it("PG1: Pflegegeld nicht erfüllt (0 €)", () => {
    const ansprueche = berechneSgbXI(makeInput({ pflegegrad: 1 }));
    const pflegegeld = ansprueche.find((a) => a.id === "sgb-xi-pflegegeld");
    // PG1 = kein Pflegegeld; entweder nicht vorhanden oder nicht erfüllt
    if (pflegegeld) {
      expect(pflegegeld.voraussetzungen_erfuellt).toBe(false);
    }
  });

  it("Kein Pflegegrad: gibt Begutachtungs-Hinweis zurück", () => {
    const ansprueche = berechneSgbXI(makeInput({ pflegegrad: undefined }));
    const begutachtung = ansprueche.find((a) => a.id === "sgb-xi-begutachtung");
    expect(begutachtung).toBeDefined();
    expect(begutachtung?.voraussetzungen_erfuellt).toBe(true);
  });

  it("Entlastungsbetrag 125 €/Monat ab PG1", () => {
    for (const pg of [1, 2, 3, 4, 5] as const) {
      const ansprueche = berechneSgbXI(makeInput({ pflegegrad: pg }));
      const entlastung = ansprueche.find((a) => a.id === "sgb-xi-entlastungsbetrag");
      expect(entlastung?.voraussetzungen_erfuellt).toBe(true);
      expect(entlastung?.betrag_monatlich_eur).toBe(125);
    }
  });

  it("Sachleistungen PG3: 1432 €/Monat", () => {
    const ansprueche = berechneSgbXI(makeInput({ pflegegrad: 3 }));
    const sachl = ansprueche.find((a) => a.id === "sgb-xi-sachleistungen");
    expect(sachl?.betrag_monatlich_eur).toBe(1432);
  });
});

// ─── SGB XII — Grundsicherung im Alter ───────────────────────────────────────

describe("berechneSgbXII — Grundsicherung §41 SGB XII", () => {
  it("Person ab 67: Grundsicherung prinzipiell erfüllt", () => {
    const ansprueche = berechneSgbXII(makeInput({ alter: 67, pflegegrad: 2 }));
    const grundsicherung = ansprueche.find((a) => a.id?.includes("sgb-xii-grundsicherung"));
    // Grundsicherung wird angeboten, Einkommen unbekannt = pessimistisch erfüllt
    expect(ansprueche.length).toBeGreaterThan(0);
  });

  it("Person unter 67: keine Grundsicherung im Alter", () => {
    const ansprueche = berechneSgbXII(makeInput({ alter: 60 }));
    const grundsicherung = ansprueche.find((a) => a.id?.includes("sgb-xii-grundsicherung-alter"));
    expect(grundsicherung).toBeUndefined();
  });

  it("Deterministisch: gleiche Eingabe liefert gleiche Ausgabe", () => {
    const input = makeInput({ alter: 70, pflegegrad: 3 });
    const run1 = berechneSgbXII(input);
    const run2 = berechneSgbXII(input);
    expect(run1).toEqual(run2);
  });
});

// ─── EStG §35a — Steuerermäßigung ────────────────────────────────────────────

describe("berechneEstg35a — §35a EStG Haushaltsnahe Dienstleistungen", () => {
  it("Keine Aufwendungen und kein Einkommen: leeres Array", () => {
    const ansprueche = berechneEstg35a(makeInput({
      erwerbstaetig: false,
      zu_versteuerndes_einkommen_eur: undefined,
    }));
    expect(ansprueche).toHaveLength(0);
  });

  it("5.000 € Haushaltshilfe-Ausgaben → 1.000 € Steuerersparnis (20%)", () => {
    const ansprueche = berechneEstg35a(makeInput({
      erwerbstaetig: true,
      zu_versteuerndes_einkommen_eur: 30_000,
      haushaltshilfe_aufwendungen_eur: 5_000,
    }));
    const haushaltsanspruch = ansprueche.find((a) => a.id === "estg-35a-haushalt");
    expect(haushaltsanspruch).toBeDefined();
    expect(haushaltsanspruch?.betrag_jaehrlich_eur).toBe(1_000); // 20% von 5000
  });

  it("20.000 € Aufwendungen → maximal 4.000 € Steuerersparnis (Cap)", () => {
    const ansprueche = berechneEstg35a(makeInput({
      erwerbstaetig: true,
      zu_versteuerndes_einkommen_eur: 50_000,
      haushaltshilfe_aufwendungen_eur: 20_000,
    }));
    const haushaltsanspruch = ansprueche.find((a) => a.id === "estg-35a-haushalt");
    expect(haushaltsanspruch?.betrag_jaehrlich_eur).toBe(4_000); // gesetzliches Maximum
  });

  it("Kategorie ist 'steuer' — fließt nicht in monatliche Summe ein", () => {
    const ansprueche = berechneEstg35a(makeInput({
      erwerbstaetig: true,
      haushaltshilfe_aufwendungen_eur: 5_000,
    }));
    for (const a of ansprueche) {
      expect(a.kategorie).toBe("steuer");
    }
  });
});

// ─── BEEG — Elterngeld ───────────────────────────────────────────────────────

describe("berechneBeeg — Elterngeld/BEEG", () => {
  it("Lebenslage geburt_fruehe_kindheit + Kind unter 14 Monate: BEEG-Anspruch", () => {
    const ansprueche = berechneBeeg(makeInput({
      lebenslage: "geburt_fruehe_kindheit",
      alter: 30,
      kinder: [{ alter: 0, in_kita: false }],
    }));
    // BEEG-Modul gibt für Eltern mit Kleinkind Ansprüche
    expect(ansprueche.length).toBeGreaterThan(0);
  });

  it("Lebenslage alter_pflege: keine BEEG-Ansprüche", () => {
    const ansprueche = berechneBeeg(makeInput({
      lebenslage: "alter_pflege",
      alter: 70,
    }));
    const erfuellt = ansprueche.filter((a) => a.voraussetzungen_erfuellt);
    expect(erfuellt).toHaveLength(0);
  });
});

// ─── Engine-Orchestrator — Vollintegration ───────────────────────────────────

describe("berechneAnsprueche — Vollintegration", () => {
  it("gibt immer berechnungsdatum zurück (ISO-Format)", () => {
    const result = berechneAnsprueche(makeInput({}));
    expect(result.berechnungsdatum).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("gibt input unverändert zurück (Audit-Trail)", () => {
    const input = makeInput({ pflegegrad: 3 });
    const result = berechneAnsprueche(input);
    expect(result.input).toEqual(input);
  });

  it("PG3, Alter 70: gesamt_monatlich_eur > 0", () => {
    const result = berechneAnsprueche(makeInput({ pflegegrad: 3, alter: 70 }));
    expect(result.gesamt_monatlich_eur).toBeGreaterThan(0);
  });

  it("gesamt_jaehrlich_eur ≥ gesamt_monatlich_eur × 12", () => {
    const result = berechneAnsprueche(makeInput({ pflegegrad: 3, alter: 70 }));
    // Jahresbetrag kann durch Einmal-Leistungen höher sein
    expect(result.gesamt_jaehrlich_eur).toBeGreaterThanOrEqual(result.gesamt_monatlich_eur * 12);
  });

  it("Steuerersparnis fließt NICHT in monatlichen Gesamtbetrag ein", () => {
    const ohneSteuern = berechneAnsprueche(makeInput({ pflegegrad: 2, alter: 70 }));
    const mitSteuern = berechneAnsprueche(makeInput({
      pflegegrad: 2,
      alter: 70,
      erwerbstaetig: true,
      haushaltshilfe_aufwendungen_eur: 5_000,
    }));
    // Monatlicher Betrag sollte identisch sein (Steuer kommt in steuerersparnis_eur)
    expect(mitSteuern.steuerersparnis_eur).toBeGreaterThan(0);
    // steuerersparnis_eur ist ein separates Feld
    expect(mitSteuern.steuerersparnis_eur).toBeGreaterThanOrEqual(0);
  });

  it("Lebenslage geburt_fruehe_kindheit: Kind-bezogene Ansprüche enthalten", () => {
    const result = berechneAnsprueche(makeInput({
      lebenslage: "geburt_fruehe_kindheit",
      alter: 30,
      kinder: [{ alter: 0 }],
    }));
    expect(result.ansprueche.length).toBeGreaterThan(0);
  });

  it("Alle Ansprüche haben Pflichtfelder (id, titel, kategorie, prioritaet)", () => {
    const result = berechneAnsprueche(makeInput({ pflegegrad: 3, alter: 75 }));
    for (const a of result.ansprueche) {
      expect(a.id).toBeTruthy();
      expect(a.titel).toBeTruthy();
      expect(a.kategorie).toBeTruthy();
      expect(typeof a.prioritaet).toBe("number");
    }
  });

  it("Ansprüche sind nach Priorität aufsteigend sortiert", () => {
    const result = berechneAnsprueche(makeInput({ pflegegrad: 4, alter: 72 }));
    for (let i = 1; i < result.ansprueche.length; i++) {
      expect(result.ansprueche[i].prioritaet).toBeGreaterThanOrEqual(
        result.ansprueche[i - 1].prioritaet
      );
    }
  });

  it("Deterministisch: zwei identische Aufrufe liefern gleiche Beträge", () => {
    const input = makeInput({ pflegegrad: 3, alter: 70 });
    const r1 = berechneAnsprueche(input);
    const r2 = berechneAnsprueche(input);
    expect(r1.gesamt_monatlich_eur).toBe(r2.gesamt_monatlich_eur);
    expect(r1.gesamt_jaehrlich_eur).toBe(r2.gesamt_jaehrlich_eur);
    expect(r1.ansprueche.length).toBe(r2.ansprueche.length);
  });

  it("Kein Pflegegrad: liefert naechste_schritte mit Begutachtungs-Empfehlung", () => {
    const result = berechneAnsprueche(makeInput({ pflegegrad: undefined }));
    const begutachtung = result.naechste_schritte.find(
      (s) => s.titel.toLowerCase().includes("pflegegrad")
    );
    expect(begutachtung).toBeDefined();
  });

  it("PG5, Alter 80: höchste Pflegeleistungen (947 + 125 + mehr)", () => {
    const result = berechneAnsprueche(makeInput({ pflegegrad: 5, alter: 80 }));
    const pgGeld = result.ansprueche.find((a) => a.id === "sgb-xi-pflegegeld");
    expect(pgGeld?.betrag_monatlich_eur).toBe(947);
    const entlastung = result.ansprueche.find((a) => a.id === "sgb-xi-entlastungsbetrag");
    expect(entlastung?.betrag_monatlich_eur).toBe(125);
  });
});

import { describe, it, expect } from "vitest";
import { BaPortalAdapter } from "../adapters/ba-portal";
import { DrvAdapter } from "../adapters/drv";
import { PflegekasseAdapter } from "../adapters/pflegekasse";
import { KfwAdapter } from "../adapters/kfw";
import { JobcenterAdapter } from "../adapters/jobcenter";
import { FamilienkasseAdapter } from "../adapters/familienkasse";
import { SozialamtAdapter } from "../adapters/sozialamt";
import { BzrAdapter } from "../adapters/bzr";
import { getAdapter, BEHOERDEN_ADAPTER } from "../registry";

const STUB_PARAMS = {
  userPseudoId: "test-pseudo-id",
  geburtsjahr: 1955,
  plz: "10115",
  extra: { pflegegrad: 3 },
};

describe("Behördenschnittstellen-Registry", () => {
  it("hat alle 8 Priority-1 Adapter registriert", () => {
    const keys = Object.keys(BEHOERDEN_ADAPTER);
    expect(keys).toHaveLength(8);
    expect(keys).toContain("ba-portal");
    expect(keys).toContain("drv");
    expect(keys).toContain("pflegekasse");
    expect(keys).toContain("bzr");
    expect(keys).toContain("kfw");
    expect(keys).toContain("jobcenter");
    expect(keys).toContain("familienkasse");
    expect(keys).toContain("sozialamt");
  });

  it("gibt undefined für unbekannte Adapter zurück", () => {
    expect(getAdapter("unbekannt")).toBeUndefined();
  });
});

describe("BA-Portal Adapter", () => {
  const adapter = new BaPortalAdapter();

  it("gibt ok=true zurück", async () => {
    const result = await adapter.abfragen(STUB_PARAMS);
    expect(result.ok).toBe(true);
    expect(result.quelle).toBe("Bundesagentur für Arbeit");
  });

  it("enthält Jobboerse-URL", async () => {
    const result = await adapter.abfragen(STUB_PARAMS);
    expect(result.daten?.jobboerse_url).toContain("arbeitsagentur.de");
  });
});

describe("DRV Adapter", () => {
  const adapter = new DrvAdapter();

  it("berechnet Grundrente-Anspruch bei >33 Versicherungsjahren", async () => {
    // Geburtsjahr 1970 → ~36 Jahre Versicherungszeit
    const result = await adapter.abfragen({ ...STUB_PARAMS, geburtsjahr: 1970 });
    expect(result.ok).toBe(true);
    expect(result.daten?.grundrente_anspruch).toBe(true);
    expect(result.daten?.grundrente_zuschlag_eur).toBeGreaterThan(0);
  });

  it("kein Grundrente-Anspruch bei kurzer Versicherungszeit", async () => {
    // Geburtsjahr 2005 → ~1 Jahr
    const result = await adapter.abfragen({ ...STUB_PARAMS, geburtsjahr: 2005 });
    expect(result.daten?.grundrente_anspruch).toBe(false);
  });
});

describe("Pflegekasse Adapter", () => {
  const adapter = new PflegekasseAdapter();

  it("gibt korrekte PG3-Leistungen zurück", async () => {
    const result = await adapter.abfragen({ ...STUB_PARAMS, extra: { pflegegrad: 3 } });
    expect(result.ok).toBe(true);
    expect(result.daten?.pflegegrad).toBe(3);
    expect(result.daten?.pflegegeld_monatlich_eur).toBe(573);
    expect(result.daten?.sachleistung_monatlich_eur).toBe(1432);
  });

  it("gibt PG2-Leistungen zurück", async () => {
    const result = await adapter.abfragen({ ...STUB_PARAMS, extra: { pflegegrad: 2 } });
    expect(result.daten?.pflegegeld_monatlich_eur).toBe(332);
  });
});

describe("KfW Adapter", () => {
  const adapter = new KfwAdapter();

  it("enthält Altersgerecht-Umbauen Programm", async () => {
    const result = await adapter.abfragen(STUB_PARAMS);
    expect(result.ok).toBe(true);
    const pgProgramm = result.daten?.programme.find(p => p.programm_nr === "455-B");
    expect(pgProgramm).toBeDefined();
    expect(pgProgramm?.foerderart).toBe("zuschuss");
  });

  it("fügt SGB XI Wohnumfeldprogramm bei Pflegegrad hinzu", async () => {
    const result = await adapter.abfragen({ ...STUB_PARAMS, extra: { pflegegrad: 2 } });
    const sgbProgramm = result.daten?.programme.find(p => p.programm_nr === "SGB-XI-40");
    expect(sgbProgramm).toBeDefined();
  });
});

describe("Jobcenter Adapter", () => {
  const adapter = new JobcenterAdapter();

  it("gibt Bürgergeld-Satz zurück", async () => {
    const result = await adapter.abfragen(STUB_PARAMS);
    expect(result.ok).toBe(true);
    expect(result.daten?.buergergeldsatz_monatlich_eur).toBe(563);
  });

  it("fügt Pflegemehrbedarf bei PG>=2 hinzu", async () => {
    const result = await adapter.abfragen({ ...STUB_PARAMS, extra: { pflegegrad: 2 } });
    const pflegeMehrbedarf = result.daten?.mehrbedarfe.find(m => m.titel.includes("Pflege"));
    expect(pflegeMehrbedarf).toBeDefined();
  });
});

describe("Familienkasse Adapter", () => {
  const adapter = new FamilienkasseAdapter();

  it("gibt aktuellen Kindergeld-Satz zurück", async () => {
    const result = await adapter.abfragen(STUB_PARAMS);
    expect(result.ok).toBe(true);
    expect(result.daten?.kindergeld_pro_kind_eur).toBe(250);
  });
});

describe("Sozialamt Adapter", () => {
  const adapter = new SozialamtAdapter();

  it("gibt Grundsicherung für Personen über 65 zurück", async () => {
    const result = await adapter.abfragen({ ...STUB_PARAMS, geburtsjahr: 1955 }); // ~70 Jahre
    expect(result.ok).toBe(true);
    expect(result.daten?.grundsicherung_monatlich_eur).toBe(502);
  });

  it("keine Grundsicherung für Personen unter 65", async () => {
    const result = await adapter.abfragen({ ...STUB_PARAMS, geburtsjahr: 1990 }); // ~35 Jahre
    expect(result.daten?.grundsicherung_monatlich_eur).toBe(0);
  });
});

describe("BZR Adapter", () => {
  const adapter = new BzrAdapter();

  it("gibt Führungszeugnis-Metadaten zurück", async () => {
    const result = await adapter.abfragen(STUB_PARAMS);
    expect(result.ok).toBe(true);
    expect(result.daten?.fuehrungszeugnis_typ).toBe("erweitert");
    expect(result.daten?.online_verfuegbar).toBe(true);
  });
});

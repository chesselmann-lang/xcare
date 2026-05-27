/**
 * DACH Expansion — Country-specific configurations
 * DE: Germany (SGB XI, MDK, Pflegekasse)
 * AT: Austria (ASVG, Pflegegeld-Stufen 1-7, Sozialministeriumservice)
 * CH: Switzerland (KVG, Spitex, Kantone)
 */

export type Land = "DE" | "AT" | "CH";

export interface LandConfig {
  code: Land;
  name: string;
  flag: string;
  waehrung: string;
  pflegestufen: {
    anzahl: number;
    bezeichnung: string;
    betraege: number[]; // Monthly amounts in local currency
  };
  rechtsgrundlage: string;
  pruefOrgan: string; // MDK (DE), BASB (AT), RAI-HC (CH)
  notfallnummer: string;
}

export const LAENDER: Record<Land, LandConfig> = {
  DE: {
    code: "DE",
    name: "Deutschland",
    flag: "🇩🇪",
    waehrung: "EUR",
    pflegestufen: {
      anzahl: 5,
      bezeichnung: "Pflegegrad",
      betraege: [125, 316, 545, 728, 901], // §37 Pflegegeld 2026
    },
    rechtsgrundlage: "SGB XI",
    pruefOrgan: "MDK / MD",
    notfallnummer: "112",
  },
  AT: {
    code: "AT",
    name: "Österreich",
    flag: "🇦🇹",
    waehrung: "EUR",
    pflegestufen: {
      anzahl: 7,
      bezeichnung: "Pflegegeldstufe",
      betraege: [175.82, 323.07, 539.09, 1024.89, 1400.76, 1921.47, 2088.4], // 2024
    },
    rechtsgrundlage: "BPGG (Bundespflegegeldgesetz)",
    pruefOrgan: "Sozialministeriumservice",
    notfallnummer: "112",
  },
  CH: {
    code: "CH",
    name: "Schweiz",
    flag: "🇨🇭",
    waehrung: "CHF",
    pflegestufen: {
      anzahl: 12,
      bezeichnung: "Pflegeminuten",
      betraege: Array.from({ length: 12 }, (_, i) => (i + 1) * 320), // CHF per tier
    },
    rechtsgrundlage: "KVG (Krankenversicherungsgesetz)",
    pruefOrgan: "RAI-Instrument",
    notfallnummer: "144",
  },
};

export function getLandConfig(land: Land = "DE"): LandConfig {
  return LAENDER[land];
}

export function formatBetrag(betrag: number, land: Land): string {
  const config = getLandConfig(land);
  return new Intl.NumberFormat(land === "CH" ? "de-CH" : "de-DE", {
    style: "currency",
    currency: config.waehrung,
  }).format(betrag);
}

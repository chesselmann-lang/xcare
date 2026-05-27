export const PFLEGEGELD_BETRAEGE: Record<number, number> = {
  2: 33200,  // 332 €
  3: 57300,  // 573 €
  4: 76500,  // 765 €
  5: 94700,  // 947 €
};

// Beratungspflicht §37 Abs. 3 SGB XI
export const BERATUNGSINTERVALL: Record<number, { monate: number; text: string }> = {
  2: { monate: 6, text: 'alle 6 Monate (PG 2)' },
  3: { monate: 6, text: 'alle 6 Monate (PG 3)' },
  4: { monate: 3, text: 'alle 3 Monate (PG 4–5)' },
  5: { monate: 3, text: 'alle 3 Monate (PG 4–5)' },
};

export const MONAT_NAMEN = [
  '', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export function berechneKombinationsleistung(pflegegradCent: number, sachleistungsanteil: number): {
  pflegegeld: number;
  sachleistung: number;
  restzahlung: number;
} {
  const sachleistungsMax: Record<number, number> = {
    33200: 76100,  // PG2
    57300: 114200, // PG3
    76500: 151500, // PG4
    94700: 181900, // PG5
  };
  const sachMax = sachleistungsMax[pflegegradCent] ?? 76100;
  const sachNutzung = Math.round(sachMax * sachleistungsanteil / 100);
  const sachNutzungsAnteil = sachNutzung / sachMax;
  const pflegegeldRest = Math.round(pflegegradCent * (1 - sachNutzungsAnteil));
  return {
    pflegegeld: pflegegeldRest,
    sachleistung: sachNutzung,
    restzahlung: pflegegeldRest,
  };
}

export function naechsteBeratungFaellig(
  pflegegrad: number,
  letzteBeratung: Date | null
): { faellig: boolean; datum: Date | null; tageNoch: number } {
  const intervall = BERATUNGSINTERVALL[pflegegrad];
  if (!letzteBeratung || !intervall) return { faellig: true, datum: null, tageNoch: 0 };
  const naechste = new Date(letzteBeratung);
  naechste.setMonth(naechste.getMonth() + intervall.monate);
  const heute = new Date();
  const tageNoch = Math.ceil((naechste.getTime() - heute.getTime()) / (1000 * 60 * 60 * 24));
  return { faellig: tageNoch <= 14, datum: naechste, tageNoch };
}

export function formatBetrag(cent: number): string {
  return `${(cent / 100).toFixed(2).replace('.', ',')} €`;
}

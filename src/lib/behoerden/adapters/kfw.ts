/**
 * KfW (Kreditanstalt für Wiederaufbau) — Adapter
 * Programme: Altersgerecht Umbauen (455-B), Wohngebäude (261), Barrierefreiheit
 * Produktions-URL: https://api.kfw.de/
 * Auth: API-Key (B2B-Partner)
 */
import { BehoerdenAdapter, BehoerdeAnfrageParams, BehoerdeAntwort } from "../adapter-base";

interface KfwDaten {
  programme: Array<{
    name: string;
    programm_nr: string;
    max_foerderung_eur: number;
    foerderart: "zuschuss" | "kredit";
    beschreibung: string;
    antrag_url: string;
  }>;
  gesamtfoerderung_max_eur: number;
}

export class KfwAdapter extends BehoerdenAdapter<KfwDaten> {
  readonly name = "KfW Förderbank";
  readonly beschreibung = "Wohnförderprogramme: Barrierefreiheit, Altersgerecht Umbauen";
  readonly api_url_prod = "https://www.kfw.de/";
  readonly rechtsgrundlage = "§40 SGB XI (Wohnumfeld) + KfW-Merkblätter";

  async abfragen(params: BehoerdeAnfrageParams): Promise<BehoerdeAntwort<KfwDaten>> {
    const programme = [
      {
        name: "Altersgerecht Umbauen — Zuschuss (455-B)",
        programm_nr: "455-B",
        max_foerderung_eur: 4000,
        foerderart: "zuschuss" as const,
        beschreibung: "Zuschuss für barrierefreien Umbau von Wohnraum (z.B. Rollstuhlrampe, Haltegriffe, bodengleiche Dusche)",
        antrag_url: "https://www.kfw.de/inlandsfoerderung/Privatpersonen/Bestandsimmobilien/Foerderprodukte/Altersgerecht-Umbauen-Zuschuss-(455)/",
      },
      {
        name: "Bundesförderung Effiziente Gebäude (261)",
        programm_nr: "261",
        max_foerderung_eur: 150000,
        foerderart: "kredit" as const,
        beschreibung: "Zinsgünstiger Kredit für energetische Sanierung — kombinierbar mit barrierefreiem Umbau",
        antrag_url: "https://www.kfw.de/inlandsfoerderung/Privatpersonen/Bestandsimmobilien/Foerderprodukte/Bundesfoerderung-Effiziente-Gebaeude-Kredit-(261)/",
      },
    ];

    const pflegegrad = (params.extra?.pflegegrad as number) ?? 0;
    if (pflegegrad >= 1) {
      programme.push({
        name: "Pflegehilfsmittel §40 SGB XI — Wohnumfeld",
        programm_nr: "SGB-XI-40",
        max_foerderung_eur: 4000,
        foerderart: "zuschuss" as const,
        beschreibung: "Pflegekasse übernimmt bis zu 4.000€ je Maßnahme für Wohnumfeldverbesserung",
        antrag_url: "https://www.pflegeberatung.de/",
      });
    }

    return this.stubAntwort({
      programme,
      gesamtfoerderung_max_eur: programme.reduce((s, p) => s + p.max_foerderung_eur, 0),
    });
  }
}

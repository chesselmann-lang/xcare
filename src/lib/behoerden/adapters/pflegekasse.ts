/**
 * Pflegekasse (GKV-Spitzenverband) — Adapter
 * Leistungen: Pflegegeld, Sachleistungen, Kurzzeitpflege, Verhinderungspflege, Tagespflege
 * Produktions-URL: GKV-Datenaustausch-Infrastruktur (DALE-UV / SGB XI §105)
 * Auth: eGK + HBA / OSCI
 */
import { BehoerdenAdapter, BehoerdeAnfrageParams, BehoerdeAntwort } from "../adapter-base";

interface PflegekasseDaten {
  pflegegrad?: number;
  pflegegeld_monatlich_eur: number;
  sachleistung_monatlich_eur: number;
  entlastungsbetrag_monatlich_eur: number;
  kurzzeitpflege_jaehrlich_eur: number;
  verhinderungspflege_jaehrlich_eur: number;
  tagespflege_monatlich_eur: number;
  pflegehilfsmittel_monatlich_eur: number;
  pflegeberatung_anspruch: boolean;
  pflegeantrag_url: string;
}

const PG_LEISTUNGEN: Record<number, Omit<PflegekasseDaten, "pflegegrad" | "pflegeberatung_anspruch" | "pflegeantrag_url">> = {
  1: { pflegegeld_monatlich_eur: 0, sachleistung_monatlich_eur: 0, entlastungsbetrag_monatlich_eur: 125, kurzzeitpflege_jaehrlich_eur: 0, verhinderungspflege_jaehrlich_eur: 0, tagespflege_monatlich_eur: 0, pflegehilfsmittel_monatlich_eur: 40 },
  2: { pflegegeld_monatlich_eur: 332, sachleistung_monatlich_eur: 761, entlastungsbetrag_monatlich_eur: 125, kurzzeitpflege_jaehrlich_eur: 1774, verhinderungspflege_jaehrlich_eur: 1685, tagespflege_monatlich_eur: 689, pflegehilfsmittel_monatlich_eur: 40 },
  3: { pflegegeld_monatlich_eur: 573, sachleistung_monatlich_eur: 1432, entlastungsbetrag_monatlich_eur: 125, kurzzeitpflege_jaehrlich_eur: 1774, verhinderungspflege_jaehrlich_eur: 1685, tagespflege_monatlich_eur: 1298, pflegehilfsmittel_monatlich_eur: 40 },
  4: { pflegegeld_monatlich_eur: 765, sachleistung_monatlich_eur: 1778, entlastungsbetrag_monatlich_eur: 125, kurzzeitpflege_jaehrlich_eur: 1774, verhinderungspflege_jaehrlich_eur: 1685, tagespflege_monatlich_eur: 1612, pflegehilfsmittel_monatlich_eur: 40 },
  5: { pflegegeld_monatlich_eur: 947, sachleistung_monatlich_eur: 2200, entlastungsbetrag_monatlich_eur: 125, kurzzeitpflege_jaehrlich_eur: 1774, verhinderungspflege_jaehrlich_eur: 1685, tagespflege_monatlich_eur: 1995, pflegehilfsmittel_monatlich_eur: 40 },
};

export class PflegekasseAdapter extends BehoerdenAdapter<PflegekasseDaten> {
  readonly name = "Pflegekasse (GKV)";
  readonly beschreibung = "Pflegeleistungen nach SGB XI";
  readonly api_url_prod = "https://www.gkv-spitzenverband.de/";
  readonly rechtsgrundlage = "§§ 14-45b SGB XI";

  async abfragen(params: BehoerdeAnfrageParams): Promise<BehoerdeAntwort<PflegekasseDaten>> {
    const pg = (params.extra?.pflegegrad as number) ?? 2;
    const leistungen = PG_LEISTUNGEN[pg] ?? PG_LEISTUNGEN[2];

    return this.stubAntwort({
      pflegegrad: pg,
      ...leistungen,
      pflegeberatung_anspruch: true,
      pflegeantrag_url: "https://www.pflegeberatung.de/",
    });
  }
}

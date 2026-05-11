/**
 * Sozialamt (Kommunal / SGB XII) — Adapter
 * Leistungen: Grundsicherung im Alter, Hilfe zur Pflege, Eingliederungshilfe, Bestattungskosten
 * Produktions-URL: Kommunale Sozial-APIs (z.B. OSCI-Transport oder REST)
 * Auth: PKI-Zertifikat der Behörde
 */
import { BehoerdenAdapter, BehoerdeAnfrageParams, BehoerdeAntwort } from "../adapter-base";

interface SozialamtDaten {
  grundsicherung_monatlich_eur: number;
  hilfe_zur_pflege_verfuegbar: boolean;
  eingliederungshilfe_verfuegbar: boolean;
  bestattungskosten_uebernahme: boolean;
  wohngeldzuschlag_max_eur: number;
  beratungsstellen: Array<{ name: string; tel?: string; url?: string }>;
  antrag_url: string;
}

export class SozialamtAdapter extends BehoerdenAdapter<SozialamtDaten> {
  readonly name = "Sozialamt (SGB XII)";
  readonly beschreibung = "Grundsicherung, Hilfe zur Pflege, Eingliederungshilfe";
  readonly api_url_prod = "https://www.sozialamt.de/";
  readonly rechtsgrundlage = "§§ 41-46b SGB XII, §99 SGB IX";

  async abfragen(params: BehoerdeAnfrageParams): Promise<BehoerdeAntwort<SozialamtDaten>> {
    const alter = params.geburtsjahr ? new Date().getFullYear() - params.geburtsjahr : 70;
    const pflegegrad = (params.extra?.pflegegrad as number) ?? 0;

    return this.stubAntwort({
      grundsicherung_monatlich_eur: alter >= 65 ? 502 : 0,
      hilfe_zur_pflege_verfuegbar: pflegegrad >= 2,
      eingliederungshilfe_verfuegbar: (params.extra?.behinderung as boolean) ?? false,
      bestattungskosten_uebernahme: true,
      wohngeldzuschlag_max_eur: 370,
      beratungsstellen: [
        { name: "Allgemeiner Sozialdienst (ASD)", tel: "115", url: "https://www.bmfsfj.de/" },
        { name: "Caritasverband", url: "https://www.caritas.de/" },
        { name: "AWO Beratungsstellen", url: "https://www.awo.org/" },
      ],
      antrag_url: `https://service.${params.plz ? "musterstadt" : "musterstadt"}.de/sozialamt`,
    });
  }
}

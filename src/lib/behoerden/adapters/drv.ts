/**
 * Deutsche Rentenversicherung (DRV) — Adapter
 * Leistungen: Rentenauskunft, Grundrente, Erwerbsminderungsrente, Reha
 * Produktions-URL: https://www.deutsche-rentenversicherung.de/SharedDocs/Downloads/DE/Experten/infos_reha_einrichtungen/Schnittstellen/
 * Auth: OSCI-Transport + Signaturkarte
 */
import { BehoerdenAdapter, BehoerdeAnfrageParams, BehoerdeAntwort } from "../adapter-base";

interface DrvDaten {
  versicherungsverlauf_jahre: number;
  rentenanspruch_aktuell_eur: number;
  grundrente_anspruch: boolean;
  grundrente_zuschlag_eur?: number;
  erwerbsminderungsrente_voll_eur: number;
  reha_leistungen_verfuegbar: boolean;
  rentenantrag_url: string;
}

export class DrvAdapter extends BehoerdenAdapter<DrvDaten> {
  readonly name = "Deutsche Rentenversicherung";
  readonly beschreibung = "Rentenauskunft, Grundrente, Erwerbsminderungsrente, Reha";
  readonly api_url_prod = "https://www.deutsche-rentenversicherung.de/";
  readonly rechtsgrundlage = "§§ 109 SGB VI, §76g SGB VI (Grundrente)";

  async abfragen(params: BehoerdeAnfrageParams): Promise<BehoerdeAntwort<DrvDaten>> {
    const alter = params.geburtsjahr ? new Date().getFullYear() - params.geburtsjahr : 55;
    const versicherungsjahre = Math.max(0, alter - 20); // Schätzung
    const grundrenteAnspruch = versicherungsjahre >= 33;

    return this.stubAntwort({
      versicherungsverlauf_jahre: versicherungsjahre,
      rentenanspruch_aktuell_eur: Math.round(versicherungsjahre * 37.6), // EP × aktueller Rentenwert
      grundrente_anspruch: grundrenteAnspruch,
      grundrente_zuschlag_eur: grundrenteAnspruch ? 418 : undefined,
      erwerbsminderungsrente_voll_eur: Math.round(versicherungsjahre * 37.6 * 0.75),
      reha_leistungen_verfuegbar: true,
      rentenantrag_url: "https://www.deutsche-rentenversicherung.de/DRV/DE/Rente/Antrag-stellen/antrag-stellen_node.html",
    });
  }
}

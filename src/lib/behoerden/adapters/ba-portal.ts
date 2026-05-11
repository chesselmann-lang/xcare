/**
 * Bundesagentur für Arbeit (BA) — Adapter
 * Leistungen: Arbeitslosengeld I (ALG I), Kurzarbeitergeld, Berufsberatung
 * Produktions-URL: https://rest-api.arbeitsagentur.de/
 * Auth: OAuth 2.0 Client Credentials (clientid + clientsecret)
 */
import { BehoerdenAdapter, BehoerdeAnfrageParams, BehoerdeAntwort } from "../adapter-base";

interface BaPortalDaten {
  arbeitslosengeld_anspruch_eur?: number;
  anspruchsdauer_monate?: number;
  kurzarbeitergeld_aktiv: boolean;
  beratungsangebote: string[];
  jobboerse_url: string;
}

export class BaPortalAdapter extends BehoerdenAdapter<BaPortalDaten> {
  readonly name = "Bundesagentur für Arbeit";
  readonly beschreibung = "ALG I, Kurzarbeitergeld, Berufsberatung";
  readonly api_url_prod = "https://rest-api.arbeitsagentur.de/";
  readonly rechtsgrundlage = "§§ 137ff SGB III";

  async abfragen(params: BehoerdeAnfrageParams): Promise<BehoerdeAntwort<BaPortalDaten>> {
    // Production: OAuth 2.0 -> /jobsuche/pc/v4/jobs
    // Stub: realistische Testdaten
    const alter = params.geburtsjahr ? new Date().getFullYear() - params.geburtsjahr : 45;
    return this.stubAntwort({
      arbeitslosengeld_anspruch_eur: alter < 50 ? 1200 : 1400,
      anspruchsdauer_monate: alter >= 58 ? 24 : 12,
      kurzarbeitergeld_aktiv: false,
      beratungsangebote: [
        "Berufsberatung für Erwachsene",
        "Weiterbildungsberatung",
        "Reha-Beratung (bei Einschränkungen)",
      ],
      jobboerse_url: `https://www.arbeitsagentur.de/jobsuche/?wo=${params.plz ?? ""}`,
    });
  }
}

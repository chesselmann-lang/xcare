/**
 * Bundeszentralregister (BZR) / BAMF — Adapter
 * Für Träger: Führungszeugnis-Auskunft (§30a BZRG), relevant bei Care-Worker-Onboarding
 * Produktions-URL: https://www.bundesjustizamt.de/
 * Auth: Behörden-PKI-Zertifikat
 *
 * DATENSCHUTZ-HINWEIS: Nur für autorisierte Behörden und Träger.
 * Keine personenbezogenen Daten werden gespeichert.
 */
import { BehoerdenAdapter, BehoerdeAnfrageParams, BehoerdeAntwort } from "../adapter-base";

interface BzrDaten {
  fuehrungszeugnis_typ: "erweitert" | "standard";
  antrag_url: string;
  bearbeitungsdauer_tage: number;
  gebuehr_eur: number;
  online_verfuegbar: boolean;
  hinweise: string[];
}

export class BzrAdapter extends BehoerdenAdapter<BzrDaten> {
  readonly name = "Bundeszentralregister (BZR)";
  readonly beschreibung = "Führungszeugnis-Auskunft für Träger (§30a BZRG)";
  readonly api_url_prod = "https://www.bundesjustizamt.de/";
  readonly rechtsgrundlage = "§§ 30, 30a BZRG";

  async abfragen(_params: BehoerdeAnfrageParams): Promise<BehoerdeAntwort<BzrDaten>> {
    // Nur Metadaten — keine personenbezogenen Echtdaten werden zurückgegeben
    return this.stubAntwort({
      fuehrungszeugnis_typ: "erweitert",
      antrag_url: "https://www.bundesjustizamt.de/fuehrungszeugnis",
      bearbeitungsdauer_tage: 14,
      gebuehr_eur: 13,
      online_verfuegbar: true,
      hinweise: [
        "Erweitertes Führungszeugnis (§30a BZRG) für Tätigkeiten mit Minderjährigen/Schutzbefohlenen",
        "Antrag online über das Bundesjustizamt oder persönlich beim Einwohnermeldeamt",
        "Gültigkeit: i.d.R. 3 Jahre für Träger akzeptiert",
        "Träger dürfen keine Kopien aufbewahren — nur Einsichtnahme",
      ],
    });
  }
}

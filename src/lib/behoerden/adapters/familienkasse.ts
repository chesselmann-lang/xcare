/**
 * Familienkasse (BA) — Adapter
 * Leistungen: Kindergeld, Kinderzuschlag, Unterhaltsvorschuss
 * Produktions-URL: https://www.arbeitsagentur.de/familie-und-kinder/
 * Auth: ELSTER-Signatur / BA-OAuth
 */
import { BehoerdenAdapter, BehoerdeAnfrageParams, BehoerdeAntwort } from "../adapter-base";

interface FamilienkasseDaten {
  kindergeld_pro_kind_eur: number;
  kinderzuschlag_max_eur: number;
  unterhaltsvorschuss_verfuegbar: boolean;
  elterngeld_min_eur: number;
  elterngeld_max_eur: number;
  elterngeld_plus_monate: number;
  antrag_kindergeld_url: string;
  antrag_kinderzuschlag_url: string;
  hinweise: string[];
}

export class FamilienkasseAdapter extends BehoerdenAdapter<FamilienkasseDaten> {
  readonly name = "Familienkasse (BA)";
  readonly beschreibung = "Kindergeld, Kinderzuschlag, Unterhaltsvorschuss, Elterngeld";
  readonly api_url_prod = "https://www.arbeitsagentur.de/";
  readonly rechtsgrundlage = "§§ 62-78 EStG, §6a BKGG, BEEG";

  async abfragen(_params: BehoerdeAnfrageParams): Promise<BehoerdeAntwort<FamilienkasseDaten>> {
    return this.stubAntwort({
      kindergeld_pro_kind_eur: 250,
      kinderzuschlag_max_eur: 292,
      unterhaltsvorschuss_verfuegbar: true,
      elterngeld_min_eur: 300,
      elterngeld_max_eur: 1800,
      elterngeld_plus_monate: 28,
      antrag_kindergeld_url: "https://www.arbeitsagentur.de/familie-und-kinder/kindergeld-beantragen",
      antrag_kinderzuschlag_url: "https://www.arbeitsagentur.de/familie-und-kinder/kinderzuschlag-beantragen",
      hinweise: [
        "Kindergeld: automatisch ab Geburt, Antrag online oder schriftlich",
        "Kinderzuschlag: einkommensabhängig, max. 292€/Kind/Mon",
        "Elterngeld: Antrag spätestens 3 Monate nach Geburt",
        "Unterhaltsvorschuss: bei Alleinerziehenden bis 18 Jahre des Kindes",
      ],
    });
  }
}

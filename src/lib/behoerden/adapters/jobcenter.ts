/**
 * Jobcenter (SGB II) — Adapter
 * Leistungen: Bürgergeld, Mehrbedarfe, Bildung & Teilhabe, Eingliederungsleistungen
 * Produktions-URL: Datenaustausch SGB II (BA-interne API)
 * Auth: BA-Zertifikat + OSCI
 */
import { BehoerdenAdapter, BehoerdeAnfrageParams, BehoerdeAntwort } from "../adapter-base";

interface JobcenterDaten {
  buergergeldsatz_monatlich_eur: number;
  mehrbedarfe: Array<{ titel: string; betrag_monatlich_eur: number }>;
  bildung_teilhabe_verfuegbar: boolean;
  eingliederungsleistungen: string[];
  antrag_url: string;
  naechste_schritte: string[];
}

export class JobcenterAdapter extends BehoerdenAdapter<JobcenterDaten> {
  readonly name = "Jobcenter (SGB II)";
  readonly beschreibung = "Bürgergeld, Mehrbedarfe, Bildung & Teilhabe";
  readonly api_url_prod = "https://www.arbeitsagentur.de/";
  readonly rechtsgrundlage = "§§ 7-9 SGB II, §21 SGB II (Mehrbedarfe), §28 SGB II (BuT)";

  async abfragen(params: BehoerdeAnfrageParams): Promise<BehoerdeAntwort<JobcenterDaten>> {
    const alter = params.geburtsjahr ? new Date().getFullYear() - params.geburtsjahr : 35;
    const pflegegrad = (params.extra?.pflegegrad as number) ?? 0;

    const mehrbedarfe = [];
    if (pflegegrad >= 2) {
      mehrbedarfe.push({ titel: "Mehrbedarf Pflege §21 Abs. 7 SGB II", betrag_monatlich_eur: 120 });
    }
    if (alter >= 65) {
      mehrbedarfe.push({ titel: "Mehrbedarf Alter §30 Abs. 1 SGB XII", betrag_monatlich_eur: 47 });
    }

    // Regelbedarfe 2024 (Alleinstehend)
    const regelbedarfssaetze: Record<string, number> = {
      allein: 563, paar_pro_person: 506, kind_14_17: 471, kind_6_13: 390, kind_0_5: 357
    };

    return this.stubAntwort({
      buergergeldsatz_monatlich_eur: regelbedarfssaetze.allein,
      mehrbedarfe,
      bildung_teilhabe_verfuegbar: alter < 25,
      eingliederungsleistungen: [
        "Berufsberatung / Vermittlung",
        "Förderung beruflicher Weiterbildung (FbW)",
        "Arbeitsgelegenheiten (AGH)",
        alter < 25 ? "Jugendberufsagenturen" : "Coaching für Langzeitarbeitslose",
      ].filter(Boolean),
      antrag_url: "https://www.jobcenter.digital/buergergeldonline",
      naechste_schritte: [
        "Online-Antrag beim Jobcenter stellen",
        "Einkommens- und Vermögensnachweise vorlegen",
        "Eingliederungsvereinbarung abschließen",
      ],
    });
  }
}

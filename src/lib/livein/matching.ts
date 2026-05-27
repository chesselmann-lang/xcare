// Live-in Pflege Matching Engine (§8 SGB XI)
import { createClient } from "@/lib/supabase/server";

export interface LiveinAnforderungen {
  pflegegrad: number;
  demenz_pflege: boolean;
  fuehrerschein_noetig: boolean;
  haustiere_vorhanden: boolean;
  bevorzugtes_geschlecht?: string;
  sprache_bevorzugt?: string;
  budget_monat?: number;
  bundesland?: string;
}

export interface AgenturMitScore {
  id: string;
  name: string;
  slug: string;
  beschreibung: string;
  herkunftslaender: string[];
  sprachen: string[];
  anstellungsmodell: string;
  preisrahmen_von: number;
  preisrahmen_bis: number;
  kontakt_email: string;
  kontakt_telefon: string;
  bewertung_schnitt: number;
  anzahl_bewertungen: number;
  matching_score: number;
  matching_gruende: string[];
}

export async function matchLiveinAgenturen(
  anforderungen: LiveinAnforderungen
): Promise<AgenturMitScore[]> {
  const supabase = await createClient();

  const { data: agenturen, error } = await supabase
    .from("livein_agenturen")
    .select("*")
    .eq("verified", true)
    .eq("aktiv", true);

  if (error || !agenturen) return [];

  return agenturen
    .map((agentur) => {
      let score = 50; // base score
      const gruende: string[] = [];

      // Budget match
      if (anforderungen.budget_monat) {
        if (anforderungen.budget_monat >= (agentur.preisrahmen_von ?? 0)) {
          score += 20;
          gruende.push("Im Budget");
        } else {
          score -= 30;
        }
      }

      // Language preference
      if (
        anforderungen.sprache_bevorzugt &&
        agentur.sprachen?.includes(anforderungen.sprache_bevorzugt)
      ) {
        score += 15;
        gruende.push(`Spricht ${anforderungen.sprache_bevorzugt}`);
      }

      // Demenz specialization
      if (anforderungen.demenz_pflege) {
        if (agentur.beschreibung?.toLowerCase().includes("demenz")) {
          score += 20;
          gruende.push("Demenz-Spezialist");
        }
      }

      // Rating bonus
      if (agentur.bewertung_schnitt >= 4.5) {
        score += 10;
        gruende.push("Top-Bewertung");
      } else if (agentur.bewertung_schnitt >= 4.0) {
        score += 5;
      }

      // Employment model legality note
      if (agentur.anstellungsmodell === "arbeitnehmerüberlassung") {
        score += 10;
        gruende.push("AÜG-konform angestellt");
      }

      return {
        ...agentur,
        matching_score: Math.max(0, Math.min(100, score)),
        matching_gruende: gruende,
      };
    })
    .sort((a, b) => b.matching_score - a.matching_score);
}

// Legal disclaimer and cost calculator for §8 SGB XI
export function berechneLiveinKosten(params: {
  pflegegrad: number;
  monatlichPreis: number;
}): {
  bruttoKosten: number;
  pflegesachleistung: number;
  eigenanteil: number;
  steuerlichAbsetzbar: number;
  hinweis: string;
} {
  // 2026 Pflegesachleistungsbeträge (§ 36 SGB XI)
  const sachleistungen = [0, 131, 724, 1363, 1693, 2095];
  const pflegesachleistung = sachleistungen[params.pflegegrad] ?? 0;

  const eigenanteil = Math.max(0, params.monatlichPreis - pflegesachleistung);

  // §35a EStG: haushaltnahe Dienstleistungen — 20% von max 20.000 EUR = max 4.000 EUR/Jahr
  const steuerlichAbsetzbar = Math.min(eigenanteil * 0.2, 333); // monthly max

  return {
    bruttoKosten: params.monatlichPreis,
    pflegesachleistung,
    eigenanteil,
    steuerlichAbsetzbar,
    hinweis:
      "Die 24h-Betreuung ist nach § 8 SGB XI zulässig, wenn die Pflegekraft im Haushalt lebt (Präsenzpflege). Bitte achten Sie auf die korrekte Anstellung (AÜG oder Entsendung).",
  };
}

// ============================================
// xcare – KI-Co-Pilot Tool Handler
// Implementierung der 4 Tool-Funktionen
// ============================================

import { berechneAnsprueche, inputAusWizardAntworten } from "@/lib/anspruch/engine";
import { createClient } from "@/lib/supabase/server";
import type { AnspruchsInput } from "@/lib/anspruch/types";

// ── Tool 1: check_eligibility ─────────────────────────────────────────────
export interface CheckEligibilityInput {
  lebenslage: AnspruchsInput["lebenslage"];
  alter: number;
  pflegegrad?: number;
  gdb?: number;
}

export async function handleCheckEligibility(input: CheckEligibilityInput) {
  const engineInput = inputAusWizardAntworten({
    lebenslage: input.lebenslage,
    alter: input.alter,
    pflegegrad: input.pflegegrad,
    gdb: input.gdb,
  });

  const ergebnis = berechneAnsprueche(engineInput);

  return {
    ansprueche_vorhanden: ergebnis.ansprueche.filter((a) => a.voraussetzungen_erfuellt).length > 0,
    anzahl_ansprueche: ergebnis.ansprueche.filter((a) => a.voraussetzungen_erfuellt).length,
    gesamt_monatlich_eur: ergebnis.gesamt_monatlich_eur,
    gesamt_jaehrlich_eur: ergebnis.gesamt_jaehrlich_eur,
    steuerersparnis_eur: ergebnis.steuerersparnis_eur,
    top_ansprueche: ergebnis.ansprueche
      .filter((a) => a.voraussetzungen_erfuellt)
      .slice(0, 5)
      .map((a) => ({
        titel: a.titel,
        betrag_monatlich: a.betrag_monatlich_eur,
        rechtsgrundlage: a.rechtsgrundlage,
        prioritaet: a.prioritaet,
      })),
    naechste_schritte: ergebnis.naechste_schritte.slice(0, 3).map((s) => ({
      titel: s.titel,
      beschreibung: s.beschreibung,
    })),
    disclaimer:
      "Diese Berechnung erfolgt deterministisch nach geltendem Recht (Stand 2025). Kein Ersatz für professionelle Rechtsberatung.",
  };
}

// ── Tool 2: find_provider ─────────────────────────────────────────────────
export interface FindProviderInput {
  kategorie: string;
  plz?: string;
  lebenslage?: string;
}

export async function handleFindProvider(input: FindProviderInput) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("anbieter")
      .select(
        `id, name, beschreibung, plz, ort, telefon, email, website, verifiziert,
         leistungen!inner(kategorie, name)`
      )
      .eq("aktiv", true)
      .ilike("leistungen.kategorie", `%${input.kategorie}%`)
      .limit(5);

    if (input.plz) {
      query = query.eq("plz", input.plz);
    }

    const { data, error } = await query;

    if (error) {
      return { anbieter: [], hinweis: "Suche momentan nicht verfügbar." };
    }

    return {
      anbieter: (data ?? []).map((a) => ({
        name: a.name,
        ort: a.ort,
        plz: a.plz,
        telefon: a.telefon,
        email: a.email,
        website: a.website,
        verifiziert: a.verifiziert,
      })),
      hinweis:
        data && data.length === 0
          ? "Keine Anbieter gefunden. Bitte versuchen Sie eine andere PLZ oder Kategorie."
          : undefined,
    };
  } catch {
    return { anbieter: [], hinweis: "Anbieter-Suche nicht verfügbar." };
  }
}

// ── Tool 3: get_medication_info ───────────────────────────────────────────
export interface GetMedicationInfoInput {
  medikament_name: string;
  wirkstoff?: string;
}

export async function handleGetMedicationInfo(input: GetMedicationInfoInput) {
  // Kein externes API — gibt allgemeine strukturierte Hinweise zurück
  return {
    medikament: input.medikament_name,
    wirkstoff: input.wirkstoff ?? "nicht angegeben",
    hinweise: [
      "Bitte lesen Sie den Beipackzettel sorgfältig.",
      "Nehmen Sie das Medikament nur wie verordnet ein.",
      "Bei Fragen wenden Sie sich an Ihren Arzt oder Apotheker.",
      "Lagern Sie Medikamente kühl, trocken und außerhalb der Reichweite von Kindern.",
    ],
    wechselwirkungen_check:
      "Für Wechselwirkungsprüfungen wenden Sie sich bitte an eine Apotheke.",
    disclaimer:
      "WICHTIG: Diese Informationen sind allgemeiner Natur und ersetzen keinen medizinischen Rat. Sprechen Sie immer mit Ihrem Arzt oder Apotheker.",
  };
}

// ── Tool 4: calculate_benefits ────────────────────────────────────────────
export interface CalculateBenefitsInput {
  alter: number;
  pflegegrad?: number;
  lebenslage: string;
}

export async function handleCalculateBenefits(input: CalculateBenefitsInput) {
  // Alias auf check_eligibility mit Fokus auf Beträge
  return handleCheckEligibility({
    lebenslage: input.lebenslage as AnspruchsInput["lebenslage"],
    alter: input.alter,
    pflegegrad: input.pflegegrad,
  });
}

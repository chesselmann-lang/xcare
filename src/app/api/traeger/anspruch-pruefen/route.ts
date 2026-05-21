import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── Anspruchs-Engine ─────────────────────────────────────────────────────────

interface AnspruchsInput {
  lebenslage: string;
  alter: number;
  pflegegrad?: number | null;
}

interface Anspruch {
  titel: string;
  rechtsgrundlage: string;
  betrag_monatlich_eur?: number;
  betrag_einmalig_eur?: number;
  voraussetzungen_erfuellt: boolean;
  hinweis?: string;
}

interface Pruefungsergebnis {
  ansprueche: Anspruch[];
  gesamt_monatlich_eur: number;
  gesamt_jaehrlich_eur: number;
  geprueft_am: string;
  lebenslage: string;
}

function berechneAnsprueche(input: AnspruchsInput): Pruefungsergebnis {
  const { lebenslage, alter, pflegegrad } = input;
  const ansprueche: Anspruch[] = [];

  // ── Alter & Pflege ────────────────────────────────────────────────────────
  if (lebenslage === "alter_pflege") {
    // Pflegegeld §37 SGB XI
    const pflegegeldBetraege: Record<number, number> = {
      1: 0, 2: 332, 3: 573, 4: 765, 5: 947
    };
    const pg = pflegegrad ?? 0;
    ansprueche.push({
      titel: "Pflegegeld §37 SGB XI",
      rechtsgrundlage: "§37 SGB XI",
      betrag_monatlich_eur: pflegegeldBetraege[pg] ?? 0,
      voraussetzungen_erfuellt: pg >= 2,
      hinweis: pg < 2 ? "Pflegegrad 2 oder höher erforderlich" : undefined,
    });

    // Pflegesachleistung §36 SGB XI
    const sachleistungBetraege: Record<number, number> = {
      1: 0, 2: 761, 3: 1432, 4: 1778, 5: 2200
    };
    ansprueche.push({
      titel: "Pflegesachleistung §36 SGB XI",
      rechtsgrundlage: "§36 SGB XI",
      betrag_monatlich_eur: sachleistungBetraege[pg] ?? 0,
      voraussetzungen_erfuellt: pg >= 2,
      hinweis: pg < 2 ? "Pflegegrad 2 oder höher erforderlich" : undefined,
    });

    // Pflegehilfsmittel §40 SGB XI
    ansprueche.push({
      titel: "Pflegehilfsmittel §40 SGB XI (Verbrauchsmaterialien)",
      rechtsgrundlage: "§40 SGB XI",
      betrag_monatlich_eur: 40,
      voraussetzungen_erfuellt: pg >= 1,
      hinweis: pg < 1 ? "Pflegegrad 1 erforderlich" : undefined,
    });

    // Wohnumfeld-Verbesserung §40 SGB XI (einmalig)
    ansprueche.push({
      titel: "Wohnumfeld-Verbesserungsmaßnahme §40 SGB XI",
      rechtsgrundlage: "§40 Abs. 4 SGB XI",
      betrag_einmalig_eur: 4000,
      voraussetzungen_erfuellt: pg >= 1,
    });

    // Entlastungsbetrag §45b SGB XI
    ansprueche.push({
      titel: "Entlastungsbetrag §45b SGB XI",
      rechtsgrundlage: "§45b SGB XI",
      betrag_monatlich_eur: 125,
      voraussetzungen_erfuellt: pg >= 1,
    });

    // Grundrente (bei Alter ≥ 63)
    if (alter >= 63) {
      ansprueche.push({
        titel: "Grundrente prüfen (DRV)",
        rechtsgrundlage: "§76g SGB VI",
        voraussetzungen_erfuellt: true,
        hinweis: "Individueller Antrag bei der Deutschen Rentenversicherung erforderlich",
      });
    }

    // Grundsicherung im Alter §41 SGB XII
    if (alter >= 65) {
      ansprueche.push({
        titel: "Grundsicherung im Alter §41 SGB XII",
        rechtsgrundlage: "§41 SGB XII",
        betrag_monatlich_eur: 502,
        voraussetzungen_erfuellt: true,
        hinweis: "Einkommens- und Vermögensprüfung durch Sozialamt erforderlich",
      });
    }
  }

  // ── Geburt & frühe Kindheit ────────────────────────────────────────────────
  if (lebenslage === "geburt_fruehe_kindheit") {
    ansprueche.push({
      titel: "Elterngeld BEEG",
      rechtsgrundlage: "§1 BEEG",
      betrag_monatlich_eur: 300,
      voraussetzungen_erfuellt: true,
      hinweis: "Mindestbetrag; einkommensabhängig bis 1.800€/Mon möglich",
    });
    ansprueche.push({
      titel: "Kindergeld §62 EStG",
      rechtsgrundlage: "§62 EStG",
      betrag_monatlich_eur: 250,
      voraussetzungen_erfuellt: true,
    });
    ansprueche.push({
      titel: "Kinderzuschlag §6a BKGG",
      rechtsgrundlage: "§6a BKGG",
      betrag_monatlich_eur: 292,
      voraussetzungen_erfuellt: true,
      hinweis: "Einkommensabhängig; max. 292€/Kind/Mon",
    });
    ansprueche.push({
      titel: "Mutterschaftsgeld §13 MuSchG",
      rechtsgrundlage: "§13 MuSchG",
      voraussetzungen_erfuellt: true,
      hinweis: "Höhe abhängig vom Nettolohn; Antrag bei Krankenkasse",
    });
    ansprueche.push({
      titel: "Hebammenhilfe §134a SGB V",
      rechtsgrundlage: "§134a SGB V",
      voraussetzungen_erfuellt: true,
    });
  }

  // ── Schulkind & Jugend ─────────────────────────────────────────────────────
  if (lebenslage === "schulkind_jugend") {
    ansprueche.push({
      titel: "Kindergeld §62 EStG",
      rechtsgrundlage: "§62 EStG",
      betrag_monatlich_eur: 250,
      voraussetzungen_erfuellt: true,
    });
    ansprueche.push({
      titel: "Bildung & Teilhabe §28 SGB II / §34 SGB XII",
      rechtsgrundlage: "§28 SGB II",
      betrag_monatlich_eur: 15,
      voraussetzungen_erfuellt: true,
      hinweis: "Schulbedarf, Klassenfahrten, Mittagessen; bei Leistungsbezug",
    });
    ansprueche.push({
      titel: "Kinderzuschlag §6a BKGG",
      rechtsgrundlage: "§6a BKGG",
      betrag_monatlich_eur: 292,
      voraussetzungen_erfuellt: true,
      hinweis: "Einkommensabhängig",
    });
  }

  // ── Behinderung & Eingliederung ────────────────────────────────────────────
  if (lebenslage === "eingliederung_behinderung") {
    ansprueche.push({
      titel: "Eingliederungshilfe §99 SGB IX",
      rechtsgrundlage: "§99 SGB IX",
      voraussetzungen_erfuellt: true,
      hinweis: "Individueller Hilfeplan; Antrag beim Eingliederungshilfeträger",
    });
    ansprueche.push({
      titel: "Grundsicherung bei Erwerbsminderung §41 SGB XII",
      rechtsgrundlage: "§41 SGB XII",
      betrag_monatlich_eur: 502,
      voraussetzungen_erfuellt: true,
      hinweis: "Bei dauerhafter Erwerbsminderung",
    });
    ansprueche.push({
      titel: "Schwerbehindertenausweis + Merkzeichen §152 SGB IX",
      rechtsgrundlage: "§152 SGB IX",
      voraussetzungen_erfuellt: true,
      hinweis: "Steuerfreibeträge + Nachteilsausgleiche; Antrag beim Versorgungsamt",
    });
    if (pflegegrad && pflegegrad >= 1) {
      ansprueche.push({
        titel: "Pflegegeld §37 SGB XI (bei Pflegegrad)",
        rechtsgrundlage: "§37 SGB XI",
        betrag_monatlich_eur: pflegegrad >= 2 ? [0,0,332,573,765,947][pflegegrad] : 0,
        voraussetzungen_erfuellt: pflegegrad >= 2,
      });
    }
  }

  // ── Erwerbsleben & Vereinbarkeit ───────────────────────────────────────────
  if (lebenslage === "erwerbsleben_vereinbarkeit") {
    ansprueche.push({
      titel: "Kindergeld §62 EStG",
      rechtsgrundlage: "§62 EStG",
      betrag_monatlich_eur: 250,
      voraussetzungen_erfuellt: true,
    });
    ansprueche.push({
      titel: "Kinderzuschlag §6a BKGG",
      rechtsgrundlage: "§6a BKGG",
      betrag_monatlich_eur: 292,
      voraussetzungen_erfuellt: true,
      hinweis: "Einkommensabhängig",
    });
    ansprueche.push({
      titel: "Pflegeunterstützungsgeld §44a SGB XI",
      rechtsgrundlage: "§44a SGB XI",
      voraussetzungen_erfuellt: true,
      hinweis: "Bei kurzzeitiger Arbeitsverhinderung zur Pflege (bis 10 Tage)",
    });
    ansprueche.push({
      titel: "Familienpflegezeit §2 FPfZG",
      rechtsgrundlage: "§2 FPfZG",
      voraussetzungen_erfuellt: true,
      hinweis: "Bis zu 2 Jahre Teilzeitarbeit bei Pflege eines Angehörigen",
    });
  }

  // ── Krankheit & Genesung ───────────────────────────────────────────────────
  if (lebenslage === "krankheit_genesung") {
    ansprueche.push({
      titel: "Krankengeld §44 SGB V",
      rechtsgrundlage: "§44 SGB V",
      voraussetzungen_erfuellt: true,
      hinweis: "70% des Bruttogehalts (max. 90% Netto) ab 7. Krankheitswoche; max. 78 Wochen",
    });
    ansprueche.push({
      titel: "Häusliche Krankenpflege §37 SGB V",
      rechtsgrundlage: "§37 SGB V",
      voraussetzungen_erfuellt: true,
      hinweis: "Arztverordnung erforderlich; Antrag bei Krankenkasse",
    });
    ansprueche.push({
      titel: "Rehabilitation §40 SGB V",
      rechtsgrundlage: "§40 SGB V",
      voraussetzungen_erfuellt: true,
      hinweis: "Stationäre oder ambulante Reha; Antrag bei Krankenkasse",
    });
    if (pflegegrad && pflegegrad >= 1) {
      ansprueche.push({
        titel: "Pflegeleistungen §36-§45 SGB XI",
        rechtsgrundlage: "§36 SGB XI",
        betrag_monatlich_eur: pflegegrad >= 2 ? 332 : 0,
        voraussetzungen_erfuellt: pflegegrad >= 2,
      });
    }
  }

  // ── Hospiz & Palliativ ─────────────────────────────────────────────────────
  if (lebenslage === "hospiz_palliativ") {
    ansprueche.push({
      titel: "Spezialisierte ambulante Palliativversorgung §37b SGB V",
      rechtsgrundlage: "§37b SGB V",
      voraussetzungen_erfuellt: true,
      hinweis: "Arztverordnung; Kostenübernahme durch GKV",
    });
    ansprueche.push({
      titel: "Stationäre Hospizversorgung §39a SGB V",
      rechtsgrundlage: "§39a SGB V",
      voraussetzungen_erfuellt: true,
      hinweis: "GKV übernimmt mindestens 95% der Kosten",
    });
    ansprueche.push({
      titel: "Pflegeunterstützungsgeld §44a SGB XI",
      rechtsgrundlage: "§44a SGB XI",
      voraussetzungen_erfuellt: true,
      hinweis: "Für Begleitpersonen: 10 bezahlte Tage bei akuter Pflegesituation",
    });
    if (pflegegrad && pflegegrad >= 3) {
      ansprueche.push({
        titel: "Kurzzeitpflege §42 SGB XI",
        rechtsgrundlage: "§42 SGB XI",
        betrag_monatlich_eur: Math.round(1774 / 12),
        voraussetzungen_erfuellt: true,
        hinweis: "Bis zu 1.774€/Jahr für max. 8 Wochen",
      });
    }
  }

  // ── Trauer & Nachlass ──────────────────────────────────────────────────────
  if (lebenslage === "trauer_nachlass") {
    ansprueche.push({
      titel: "Witwenrente / Witwerrente §46 SGB VI",
      rechtsgrundlage: "§46 SGB VI",
      voraussetzungen_erfuellt: true,
      hinweis: "25% (kleine) oder 55% (große) der Rentenansprüche des Verstorbenen",
    });
    ansprueche.push({
      titel: "Waisengeld §48 SGB VI",
      rechtsgrundlage: "§48 SGB VI",
      voraussetzungen_erfuellt: alter < 27,
      hinweis: alter >= 27 ? "Nur bis zum 27. Lebensjahr" : "Halbwaisen 10%, Vollwaisen 20% der Rente",
    });
    ansprueche.push({
      titel: "Sterbegeld / Kostenerstattung Bestattung",
      rechtsgrundlage: "§74 SGB XII",
      voraussetzungen_erfuellt: true,
      hinweis: "Übernahme der Bestattungskosten durch Sozialamt bei nachgewiesener Bedürftigkeit",
    });
  }

  // ── Summen ────────────────────────────────────────────────────────────────
  const erfuellteAnsprueche = ansprueche.filter(a => a.voraussetzungen_erfuellt);
  const gesamt_monatlich_eur = erfuellteAnsprueche.reduce(
    (sum, a) => sum + (a.betrag_monatlich_eur ?? 0), 0
  );

  return {
    ansprueche,
    gesamt_monatlich_eur,
    gesamt_jaehrlich_eur: gesamt_monatlich_eur * 12,
    geprueft_am: new Date().toISOString(),
    lebenslage,
  };
}

// ─── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (profile?.role !== "traeger") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: traeger } = await supabase
      .from("traeger_profiles").select("id").eq("profile_id", profile.id).single();
    if (!traeger) return NextResponse.json({ error: "No Träger profile" }, { status: 403 });

    const body = await req.json();
    const { klientId, lebenslage, pflegegrad, alter } = body as {
      klientId: string;
      lebenslage: string;
      pflegegrad?: number | null;
      alter?: number;
    };

    if (!klientId || !lebenslage) {
      return NextResponse.json({ error: "klientId und lebenslage erforderlich" }, { status: 400 });
    }

    // Verify ownership
    const { data: klient } = await supabase
      .from("traeger_klienten")
      .select("id, traeger_id")
      .eq("id", klientId)
      .eq("traeger_id", traeger.id)
      .single();

    if (!klient) return NextResponse.json({ error: "Klient nicht gefunden" }, { status: 404 });

    // Run check engine
    const ergebnis = berechneAnsprueche({
      lebenslage,
      alter: alter ?? 65,
      pflegegrad: pflegegrad ?? null,
    });

    // Save result
    const { error: updateError } = await supabase
      .from("traeger_klienten")
      .update({
        pruefungs_ergebnis: ergebnis,
        letzte_pruefung_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", klientId);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, ergebnis });
  } catch (err) {
    logger.error("[anspruch-pruefen]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * Anonyme Anspruchsprüfung für CSV-Massenprüfung.
 * Kein klientId erforderlich — nur Lebenslage + Alter + Pflegegrad.
 * Auth: Träger-Rolle erforderlich.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface AnspruchsInput {
  lebenslage: string;
  alter: number;
  pflegegrad?: number | null;
}

function berechneAnsprueche(input: AnspruchsInput) {
  const { lebenslage, alter, pflegegrad } = input;
  const ansprueche: Array<{
    titel: string;
    betrag_monatlich_eur?: number;
    voraussetzungen_erfuellt: boolean;
  }> = [];

  const pg = pflegegrad ?? 0;

  if (lebenslage === "alter_pflege") {
    const pgGeld: Record<number, number> = { 1: 0, 2: 332, 3: 573, 4: 765, 5: 947 };
    ansprueche.push({ titel: "Pflegegeld §37 SGB XI", betrag_monatlich_eur: pgGeld[pg] ?? 0, voraussetzungen_erfuellt: pg >= 2 });
    ansprueche.push({ titel: "Entlastungsbetrag §45b SGB XI", betrag_monatlich_eur: 125, voraussetzungen_erfuellt: pg >= 1 });
    if (alter >= 65) ansprueche.push({ titel: "Grundsicherung §41 SGB XII", betrag_monatlich_eur: 502, voraussetzungen_erfuellt: true });
  } else if (lebenslage === "geburt_fruehe_kindheit") {
    ansprueche.push({ titel: "Elterngeld BEEG", betrag_monatlich_eur: 300, voraussetzungen_erfuellt: true });
    ansprueche.push({ titel: "Kindergeld §62 EStG", betrag_monatlich_eur: 250, voraussetzungen_erfuellt: true });
    ansprueche.push({ titel: "Kinderzuschlag §6a BKGG", betrag_monatlich_eur: 292, voraussetzungen_erfuellt: true });
  } else if (lebenslage === "schulkind_jugend") {
    ansprueche.push({ titel: "Kindergeld §62 EStG", betrag_monatlich_eur: 250, voraussetzungen_erfuellt: true });
    ansprueche.push({ titel: "Bildung & Teilhabe §28 SGB II", betrag_monatlich_eur: 15, voraussetzungen_erfuellt: true });
  } else if (lebenslage === "eingliederung_behinderung") {
    ansprueche.push({ titel: "Grundsicherung §41 SGB XII", betrag_monatlich_eur: 502, voraussetzungen_erfuellt: true });
    ansprueche.push({ titel: "Eingliederungshilfe §99 SGB IX", voraussetzungen_erfuellt: true });
    if (pg >= 2) ansprueche.push({ titel: "Pflegegeld §37 SGB XI", betrag_monatlich_eur: [0,0,332,573,765,947][pg] ?? 0, voraussetzungen_erfuellt: true });
  } else if (lebenslage === "erwerbsleben_vereinbarkeit") {
    ansprueche.push({ titel: "Kindergeld §62 EStG", betrag_monatlich_eur: 250, voraussetzungen_erfuellt: true });
    ansprueche.push({ titel: "Kinderzuschlag §6a BKGG", betrag_monatlich_eur: 292, voraussetzungen_erfuellt: true });
  } else if (lebenslage === "krankheit_genesung") {
    ansprueche.push({ titel: "Krankengeld §44 SGB V", voraussetzungen_erfuellt: true });
    if (pg >= 2) ansprueche.push({ titel: "Pflegegeld §37 SGB XI", betrag_monatlich_eur: [0,0,332,573,765,947][pg] ?? 0, voraussetzungen_erfuellt: true });
  } else if (lebenslage === "hospiz_palliativ") {
    ansprueche.push({ titel: "SAPV §37b SGB V", voraussetzungen_erfuellt: true });
    ansprueche.push({ titel: "Stationäre Hospizversorgung §39a SGB V", voraussetzungen_erfuellt: true });
  } else if (lebenslage === "trauer_nachlass") {
    ansprueche.push({ titel: "Witwenrente §46 SGB VI", voraussetzungen_erfuellt: true });
    if (alter < 27) ansprueche.push({ titel: "Waisengeld §48 SGB VI", voraussetzungen_erfuellt: true });
  }

  const erfuellt = ansprueche.filter(a => a.voraussetzungen_erfuellt);
  const gesamt = erfuellt.reduce((s, a) => s + (a.betrag_monatlich_eur ?? 0), 0);

  return { ansprueche, gesamt_monatlich_eur: gesamt, gesamt_jaehrlich_eur: gesamt * 12 };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("user_id", user.id).single();
    if (profile?.role !== "traeger") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { lebenslage, alter, pflegegrad } = await req.json() as AnspruchsInput;
    if (!lebenslage) return NextResponse.json({ error: "lebenslage erforderlich" }, { status: 400 });

    const ergebnis = berechneAnsprueche({ lebenslage, alter: alter ?? 65, pflegegrad });
    return NextResponse.json({ ok: true, ergebnis });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

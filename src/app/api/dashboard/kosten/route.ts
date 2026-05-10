import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  // Pflegekosten ab Monatsbeginn
  const { data: kostenRaw, error } = await supabase
    .from("pflegekosten")
    .select("id, kategorie, betrag, erstattung, buchungsdatum, beschreibung")
    .eq("profil_id", user.id)
    .gte(
      "buchungsdatum",
      // Erster Tag des aktuellen Monats (UTC)
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    )
    .order("buchungsdatum", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const kosten = kostenRaw ?? [];

  // Aggregation nach Kategorien
  const kategorienMap = new Map<string, { betrag: number; erstattung: number }>();
  let totalAusgaben = 0;
  let totalErstattungen = 0;

  for (const k of kosten) {
    const betrag = Number(k.betrag ?? 0);
    const erstattung = Number(k.erstattung ?? 0);
    totalAusgaben += betrag;
    totalErstattungen += erstattung;

    const existing = kategorienMap.get(k.kategorie) ?? { betrag: 0, erstattung: 0 };
    kategorienMap.set(k.kategorie, {
      betrag: existing.betrag + betrag,
      erstattung: existing.erstattung + erstattung,
    });
  }

  const kategorien = Array.from(kategorienMap.entries()).map(([kategorie, werte]) => ({
    kategorie,
    betrag: werte.betrag,
    erstattung: werte.erstattung,
  }));

  return NextResponse.json({
    kosten: kategorien,
    einzel: kosten,
    totals: {
      ausgaben: totalAusgaben,
      erstattungen: totalErstattungen,
      netto: totalAusgaben - totalErstattungen,
    },
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/steuerbescheinigung?jahr=2025
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const jahrParam = searchParams.get("jahr");
    const jahr = jahrParam ? parseInt(jahrParam, 10) : new Date().getFullYear();

    if (isNaN(jahr)) {
      return NextResponse.json({ error: "Ungültiges Jahr" }, { status: 400 });
    }

    const vonDatum = `${jahr}-01-01`;
    const bisDatum = `${jahr}-12-31`;

    // 1. Pflegekosten
    const { data: pflegekosten } = await supabase
      .from("pflegekosten")
      .select("buchungsdatum, beschreibung, betrag, kategorie")
      .eq("profil_id", user.id)
      .gte("buchungsdatum", vonDatum)
      .lte("buchungsdatum", bisDatum)
      .order("buchungsdatum");

    // 2. Budget-Transaktionen
    const { data: budgets } = await supabase
      .from("pflegekassen_budgets")
      .select("id, leistungsart")
      .eq("profil_id", user.id)
      .eq("jahr", jahr);

    const budgetIds = (budgets ?? []).map((b: { id: string }) => b.id);
    const budgetMap: Record<string, string> = {};
    for (const b of budgets ?? []) {
      budgetMap[(b as { id: string; leistungsart: string }).id] = (b as { id: string; leistungsart: string }).leistungsart;
    }

    type TxRow = { budget_id: string; datum: string; beschreibung: string | null; betrag: number };
    let budgetTransaktionen: TxRow[] = [];

    if (budgetIds.length > 0) {
      const { data: txData } = await supabase
        .from("budget_transaktionen")
        .select("budget_id, datum, beschreibung, betrag")
        .in("budget_id", budgetIds)
        .gte("datum", vonDatum)
        .lte("datum", bisDatum)
        .order("datum");

      budgetTransaktionen = (txData ?? []) as TxRow[];
    }

    type Zeile = {
      datum: string;
      beschreibung: string;
      betrag: number;
      kategorie: string;
      rechtsgrundlage: string;
    };

    const zeilen: Zeile[] = [];

    for (const pk of pflegekosten ?? []) {
      zeilen.push({
        datum: (pk as { buchungsdatum: string }).buchungsdatum,
        beschreibung: (pk as { beschreibung: string | null }).beschreibung ?? "",
        betrag: (pk as { betrag: number }).betrag,
        kategorie: (pk as { kategorie: string | null }).kategorie ?? "Sonstiges",
        rechtsgrundlage: "§ 35a EStG / SGB XI",
      });
    }

    for (const tx of budgetTransaktionen) {
      const leistungsart = budgetMap[tx.budget_id] ?? "Unbekannt";
      zeilen.push({
        datum: tx.datum,
        beschreibung: tx.beschreibung ?? leistungsart,
        betrag: tx.betrag,
        kategorie: leistungsart,
        rechtsgrundlage: rechtsgrundlageForLeistungsart(leistungsart),
      });
    }

    zeilen.sort((a, b) => a.datum.localeCompare(b.datum));

    const kategorienSummen: Record<string, number> = {};
    for (const z of zeilen) {
      kategorienSummen[z.kategorie] = (kategorienSummen[z.kategorie] ?? 0) + z.betrag;
    }

    const gesamtbetrag = zeilen.reduce((s, z) => s + z.betrag, 0);

    return NextResponse.json({
      jahr,
      zeilen,
      kategorienSummen,
      gesamtbetrag,
      hinweis: "§ 35a EStG — Haushaltsnahe Dienstleistungen und Pflegeleistungen",
    });
  } catch (err) {
    console.error("[GET /api/steuerbescheinigung]", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

function rechtsgrundlageForLeistungsart(leistungsart: string): string {
  const map: Record<string, string> = {
    Pflegegeld: "§ 37 SGB XI",
    Pflegesachleistung: "§ 36 SGB XI",
    Verhinderungspflege: "§ 39 SGB XI",
    Kurzzeitpflege: "§ 42 SGB XI",
    Entlastungsbetrag: "§ 45b SGB XI",
    Tages_und_Nachtpflege: "§ 41 SGB XI",
  };
  return map[leistungsart] ?? "SGB XI / § 35a EStG";
}

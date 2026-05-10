import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const monatParam = searchParams.get("monat");

    let von: string;
    let bis: string;

    if (monatParam && /^\d{4}-\d{2}$/.test(monatParam)) {
      const [year, month] = monatParam.split("-").map(Number);
      von = `${year}-${String(month).padStart(2, "0")}-01`;
      const nextMonth = month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, "0")}-01`;
      bis = nextMonth;
    } else {
      const now = new Date();
      von = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const nextMonth = now.getMonth() === 11
        ? `${now.getFullYear() + 1}-01-01`
        : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}-01`;
      bis = nextMonth;
    }

    const { data, error } = await supabase
      .from("pflegekosten")
      .select("*")
      .eq("profil_id", user.id)
      .gte("buchungsdatum", von)
      .lt("buchungsdatum", bis)
      .order("buchungsdatum", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { buchungsdatum, betrag, kategorie, beschreibung, belegnummer, erstattung } = body;

    if (!beschreibung?.trim() || betrag === undefined || !kategorie) {
      return NextResponse.json(
        { error: "Beschreibung, Betrag und Kategorie sind erforderlich" },
        { status: 400 }
      );
    }

    if (typeof betrag !== "number" || betrag <= 0) {
      return NextResponse.json({ error: "Betrag muss eine positive Zahl sein" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("pflegekosten")
      .insert({
        profil_id: user.id,
        buchungsdatum: buchungsdatum ?? new Date().toISOString().split("T")[0],
        betrag,
        kategorie,
        beschreibung: beschreibung.trim(),
        belegnummer: belegnummer?.trim() || null,
        erstattung: erstattung ?? 0,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 });

    const { error } = await supabase
      .from("pflegekosten")
      .delete()
      .eq("id", id)
      .eq("profil_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

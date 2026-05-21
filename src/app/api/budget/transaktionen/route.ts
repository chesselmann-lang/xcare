import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/budget/transaktionen?budget_id=...
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const budgetId = searchParams.get("budget_id");

    if (!budgetId) {
      return NextResponse.json({ error: "budget_id ist erforderlich" }, { status: 400 });
    }

    const { data: budget } = await supabase
      .from("pflegekassen_budgets")
      .select("id")
      .eq("id", budgetId)
      .eq("profil_id", user.id)
      .single();

    if (!budget) {
      return NextResponse.json({ error: "Budget nicht gefunden" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("budget_transaktionen")
      .select("*")
      .eq("budget_id", budgetId)
      .order("datum", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ transaktionen: data ?? [] });
  } catch (err) {
    logger.error("[GET /api/budget/transaktionen]", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST /api/budget/transaktionen
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const body = await request.json() as {
      budget_id: string;
      betrag: number;
      beschreibung?: string;
      datum: string;
      beleg_url?: string;
    };

    if (!body.budget_id || body.betrag == null || !body.datum) {
      return NextResponse.json({ error: "budget_id, betrag und datum sind erforderlich" }, { status: 400 });
    }

    const { data: budget } = await supabase
      .from("pflegekassen_budgets")
      .select("id, verbraucht")
      .eq("id", body.budget_id)
      .eq("profil_id", user.id)
      .single();

    if (!budget) {
      return NextResponse.json({ error: "Budget nicht gefunden" }, { status: 404 });
    }

    const { data: transaktion, error: tErr } = await supabase
      .from("budget_transaktionen")
      .insert({
        budget_id: body.budget_id,
        betrag: body.betrag,
        beschreibung: body.beschreibung ?? null,
        datum: body.datum,
        beleg_url: body.beleg_url ?? null,
      })
      .select()
      .single();

    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

    const neuesVerbraucht = Number(budget.verbraucht) + body.betrag;
    await supabase
      .from("pflegekassen_budgets")
      .update({ verbraucht: neuesVerbraucht })
      .eq("id", body.budget_id);

    return NextResponse.json({ transaktion }, { status: 201 });
  } catch (err) {
    logger.error("[POST /api/budget/transaktionen]", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// DELETE /api/budget/transaktionen?id=...
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id ist erforderlich" }, { status: 400 });
    }

    const { data: tx } = await supabase
      .from("budget_transaktionen")
      .select("id, betrag, budget_id")
      .eq("id", id)
      .single();

    if (!tx) return NextResponse.json({ error: "Transaktion nicht gefunden" }, { status: 404 });

    const { data: budget } = await supabase
      .from("pflegekassen_budgets")
      .select("id, verbraucht")
      .eq("id", tx.budget_id)
      .eq("profil_id", user.id)
      .single();

    if (!budget) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });

    const { error: delErr } = await supabase
      .from("budget_transaktionen")
      .delete()
      .eq("id", id);

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    const neuesVerbraucht = Math.max(0, Number(budget.verbraucht) - Number(tx.betrag));
    await supabase
      .from("pflegekassen_budgets")
      .update({ verbraucht: neuesVerbraucht })
      .eq("id", tx.budget_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("[DELETE /api/budget/transaktionen]", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

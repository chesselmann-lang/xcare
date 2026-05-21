import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/budget?jahr=2025
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

    const { data, error } = await supabase
      .from("pflegekassen_budgets")
      .select("*")
      .eq("profil_id", user.id)
      .eq("jahr", jahr)
      .order("leistungsart");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ budgets: data ?? [] });
  } catch (err) {
    logger.error("[GET /api/budget]", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST /api/budget
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const body = await request.json() as {
      leistungsart: string;
      jahresbudget: number;
      jahr: number;
    };

    if (!body.leistungsart || body.jahresbudget == null || body.jahr == null) {
      return NextResponse.json({ error: "leistungsart, jahresbudget und jahr sind erforderlich" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("pflegekassen_budgets")
      .insert({
        profil_id: user.id,
        leistungsart: body.leistungsart,
        jahresbudget: body.jahresbudget,
        verbraucht: 0,
        jahr: body.jahr,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ budget: data }, { status: 201 });
  } catch (err) {
    logger.error("[POST /api/budget]", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// PATCH /api/budget
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

    const body = await request.json() as {
      id: string;
      verbraucht: number;
    };

    if (!body.id || body.verbraucht == null) {
      return NextResponse.json({ error: "id und verbraucht sind erforderlich" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("pflegekassen_budgets")
      .update({ verbraucht: body.verbraucht })
      .eq("id", body.id)
      .eq("profil_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Budget nicht gefunden" }, { status: 404 });

    return NextResponse.json({ budget: data });
  } catch (err) {
    logger.error("[PATCH /api/budget]", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

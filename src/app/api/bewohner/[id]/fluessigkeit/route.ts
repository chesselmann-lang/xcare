import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: _prof } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
    const { data: anbieter } = await (supabase as any)
        .from("anbieter")
        .select("id")
        .eq("profile_id", _prof?.id ?? "")
        .single();
    if (!anbieter) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: bewohner } = await (supabase as any)
      .from("bewohner")
      .select("id")
      .eq("id", id)
      .eq("anbieter_id", (anbieter as any).id)
      .single();
    if (!bewohner) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceStr = since.toISOString().split("T")[0];

    const { data: protokoll, error: protokollError } = await (supabase as any)
      .from("fluessigkeits_protokoll")
      .select("*")
      .eq("bewohner_id", id)
      .eq("anbieter_id", (anbieter as any).id)
      .gte("datum", sinceStr)
      .order("datum", { ascending: false })
      .order("uhrzeit", { ascending: false })
      .limit(200);

    if (protokollError) {
      logger.error("GET /api/bewohner/[id]/fluessigkeit - protokoll fetch", {
        error: protokollError,
      });
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    const rows = (protokoll as any[]) ?? [];
    const today = new Date().toISOString().split("T")[0];

    const einfuhrHeute = rows
      .filter((r) => r.bilanz_typ === "einfuhr" && r.datum === today)
      .reduce((sum, r) => sum + (r.menge_ml ?? 0), 0);

    const ausfuhrHeute = rows
      .filter((r) => r.bilanz_typ === "ausfuhr" && r.datum === today)
      .reduce((sum, r) => sum + (r.menge_ml ?? 0), 0);

    const bilanzHeute = einfuhrHeute - ausfuhrHeute;

    return NextResponse.json({
      protokoll: rows,
      stats: { einfuhrHeute, ausfuhrHeute, bilanzHeute },
    });
  } catch (err: unknown) {
    logger.error("GET /api/bewohner/[id]/fluessigkeit", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: _prof } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
    const { data: anbieter } = await (supabase as any)
        .from("anbieter")
        .select("id")
        .eq("profile_id", _prof?.id ?? "")
        .single();
    if (!anbieter) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: bewohner } = await (supabase as any)
      .from("bewohner")
      .select("id")
      .eq("id", id)
      .eq("anbieter_id", (anbieter as any).id)
      .single();
    if (!bewohner) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { datum, uhrzeit, menge_ml, bilanz_typ, art, besonderheiten } = body;

    if (!menge_ml || menge_ml <= 0) {
      return NextResponse.json(
        { error: "menge_ml must be greater than 0" },
        { status: 400 }
      );
    }

    if (!art) {
      return NextResponse.json(
        { error: "art is required" },
        { status: 400 }
      );
    }

    const insertData = {
      bewohner_id: id,
      anbieter_id: (anbieter as any).id,
      datum,
      uhrzeit,
      menge_ml,
      bilanz_typ,
      art,
      besonderheiten: besonderheiten ?? null,
      erfasst_von: user.id,
    };

    const { data, error } = await (supabase as any)
      .from("fluessigkeits_protokoll")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error("POST /api/bewohner/[id]/fluessigkeit - insert", { error });
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    return NextResponse.json(data as any, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST /api/bewohner/[id]/fluessigkeit", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

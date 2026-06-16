import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: _prof } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
    const { data: anbieter } = await (supabase as any)
        .from("anbieter")
        .select("id")
        .eq("profile_id", _prof?.id ?? "")
        .single();
    if (!anbieter) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: bewohner } = await (supabase as any).from("bewohner").select("id").eq("id", id).eq("anbieter_id", (anbieter as any).id).single();
    if (!bewohner) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split("T")[0];

    const { data: protokollRaw, error } = await (supabase as any)
      .from("lagerungsprotokoll")
      .select("*")
      .eq("bewohner_id", id)
      .gte("datum", threeDaysAgoStr)
      .order("datum", { ascending: false })
      .order("uhrzeit", { ascending: false })
      .limit(100);

    if (error) {
      logger.error("GET /api/bewohner/[id]/lagerung — fetch protokoll", { error });
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    const protokoll = (protokollRaw ?? []) as any[];

    const today = new Date().toISOString().split("T")[0];
    const heuteAnzahl = protokoll.filter((e: any) => e.datum === today).length;
    const letztePosition = protokoll[0]?.position ?? null;
    const letzteHautinspektion = protokoll[0]?.hautinspektion ?? null;

    return NextResponse.json({
      protokoll,
      stats: {
        heuteAnzahl,
        letztePosition,
        letzteHautinspektion,
      },
    });
  } catch (err: unknown) {
    logger.error("GET /api/bewohner/[id]/lagerung", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: _prof } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
    const { data: anbieter } = await (supabase as any)
        .from("anbieter")
        .select("id")
        .eq("profile_id", _prof?.id ?? "")
        .single();
    if (!anbieter) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: bewohner } = await (supabase as any).from("bewohner").select("id").eq("id", id).eq("anbieter_id", (anbieter as any).id).single();
    if (!bewohner) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { datum, position, hautinspektion, besonderheiten, naechste_lagerung } = body;
    let { uhrzeit } = body;

    if (!position) {
      return NextResponse.json({ error: "position is required" }, { status: 400 });
    }

    if (!uhrzeit) {
      uhrzeit = new Date().toTimeString().slice(0, 5);
    }

    const { data: inserted, error } = await (supabase as any)
      .from("lagerungsprotokoll")
      .insert({
        bewohner_id: id,
        anbieter_id: (anbieter as any).id,
        datum: datum ?? new Date().toISOString().split("T")[0],
        uhrzeit,
        position,
        hautinspektion,
        besonderheiten,
        naechste_lagerung,
        erfasst_von: user.id,
      })
      .select()
      .single();

    if (error) {
      logger.error("POST /api/bewohner/[id]/lagerung — insert protokoll", { error });
      return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
    }

    return NextResponse.json(inserted as any, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST /api/bewohner/[id]/lagerung", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

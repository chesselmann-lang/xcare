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

    const { data: anbieter } = await (supabase as any)
      .from("anbieter")
      .select("id")
      .eq("owner_id", user.id)
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
    since.setDate(since.getDate() - 90);
    const sinceStr = since.toISOString().split("T")[0];

    const { data: protokoll, error: protokollError } = await (supabase as any)
      .from("ernaehrungs_protokoll")
      .select("*")
      .eq("bewohner_id", id)
      .eq("anbieter_id", (anbieter as any).id)
      .gte("datum", sinceStr)
      .order("datum", { ascending: false })
      .order("mahlzeit", { ascending: true });

    if (protokollError) {
      logger.error("GET /api/bewohner/[id]/ernaehrung - protokoll fetch", {
        error: protokollError,
      });
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    const { data: ziele, error: zieleError } = await (supabase as any)
      .from("ernaehrungs_ziele")
      .select("*")
      .eq("bewohner_id", id)
      .eq("anbieter_id", (anbieter as any).id)
      .maybeSingle();

    if (zieleError) {
      logger.error("GET /api/bewohner/[id]/ernaehrung - ziele fetch", {
        error: zieleError,
      });
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    const rows = (protokoll as any[]) ?? [];

    const gesamt = rows.length;

    const withAufnahme = rows.filter(
      (r) => r.aufgenommen_prozent !== null && r.aufgenommen_prozent !== undefined
    );
    const durchschnittAufnahme =
      withAufnahme.length > 0
        ? Math.round(
            (withAufnahme.reduce((sum, r) => sum + r.aufgenommen_prozent, 0) /
              withAufnahme.length) *
              10
          ) / 10
        : 0;

    const withGewicht = rows.find(
      (r) => r.gewicht_kg !== null && r.gewicht_kg !== undefined
    );
    const letztesGewicht = withGewicht ?? null;

    const mnaScore = (ziele as any)?.mna_score ?? null;

    const stats = { gesamt, durchschnittAufnahme, letztesGewicht, mnaScore };

    return NextResponse.json({ protokoll: rows, ziele: ziele ?? null, stats });
  } catch (err) {
    logger.error("GET /api/bewohner/[id]/ernaehrung", { error: err });
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

    const { data: anbieter } = await (supabase as any)
      .from("anbieter")
      .select("id")
      .eq("owner_id", user.id)
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

    if (body.update_ziele === true) {
      const {
        update_ziele: _,
        ...zieleFields
      } = body;

      const upsertData = {
        ...zieleFields,
        bewohner_id: id,
        anbieter_id: (anbieter as any).id,
        aktualisiert_am: new Date().toISOString(),
        aktualisiert_von: user.id,
      };

      const { data, error } = await (supabase as any)
        .from("ernaehrungs_ziele")
        .upsert(upsertData, { onConflict: "bewohner_id" })
        .select()
        .single();

      if (error) {
        logger.error("POST /api/bewohner/[id]/ernaehrung - upsert ziele", {
          error,
        });
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
      }

      return NextResponse.json(data as any, { status: 200 });
    } else {
      if (!body.mahlzeit) {
        return NextResponse.json(
          { error: "mahlzeit is required" },
          { status: 400 }
        );
      }

      const insertData = {
        ...body,
        bewohner_id: id,
        anbieter_id: (anbieter as any).id,
        erfasst_von: user.id,
      };

      const { data, error } = await (supabase as any)
        .from("ernaehrungs_protokoll")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        logger.error("POST /api/bewohner/[id]/ernaehrung - insert protokoll", {
          error,
        });
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
      }

      return NextResponse.json(data as any, { status: 201 });
    }
  } catch (err) {
    logger.error("POST /api/bewohner/[id]/ernaehrung", { error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

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

    const [{ data: risikenRaw }, { data: lagerungsplanRaw }] = await Promise.all([
      (supabase as any)
        .from("dekubitus_risiko")
        .select("*")
        .eq("bewohner_id", id)
        .order("datum", { ascending: false })
        .limit(20),
      (supabase as any)
        .from("lagerungsplan")
        .select("*")
        .eq("bewohner_id", id)
        .maybeSingle(),
    ]);

    const risiken = (risikenRaw ?? []) as any[];
    const lagerungsplan = lagerungsplanRaw as any;

    const stats = {
      anzahlEinschaetzungen: risiken.length,
      letzterBradenScore: risiken[0]?.braden_score ?? null,
      aktuelleRisikostufe: risiken[0]?.risikostufe ?? null,
      naechsteEinschaetzung: risiken[0]?.naechste_einschaetzung ?? null,
    };

    return NextResponse.json({ risiken, lagerungsplan, stats });
  } catch (err) {
    logger.error("GET /api/bewohner/[id]/dekubitus", { error: err });
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

    if (body.update_lagerungsplan === true) {
      const { intervall_min, positionen, hilfsmittel, besonderheiten } = body;

      const { data: upserted, error } = await (supabase as any)
        .from("lagerungsplan")
        .upsert(
          {
            bewohner_id: id,
            anbieter_id: (anbieter as any).id,
            intervall_min,
            positionen,
            hilfsmittel,
            besonderheiten,
            erstellt_von: user.id,
            aktualisiert_am: new Date().toISOString(),
          },
          { onConflict: "bewohner_id" }
        )
        .select()
        .single();

      if (error) {
        logger.error("POST /api/bewohner/[id]/dekubitus — upsert lagerungsplan", { error });
        return NextResponse.json({ error: "Failed to update Lagerungsplan" }, { status: 500 });
      }

      return NextResponse.json(upserted as any, { status: 200 });
    }

    // New Braden assessment
    const {
      sensorische_wahrnehmung,
      feuchtigkeit,
      aktivitaet,
      mobilitaet,
      ernaehrung,
      reibung_scherkraefte,
      datum,
      vorhandene_laesionen,
      hautbefund,
      massnahmen,
      naechste_einschaetzung,
    } = body;

    if (
      sensorische_wahrnehmung == null ||
      feuchtigkeit == null ||
      aktivitaet == null ||
      mobilitaet == null ||
      ernaehrung == null ||
      reibung_scherkraefte == null
    ) {
      return NextResponse.json(
        { error: "All 6 Braden subscales are required" },
        { status: 400 }
      );
    }

    const braden_score =
      Number(sensorische_wahrnehmung) +
      Number(feuchtigkeit) +
      Number(aktivitaet) +
      Number(mobilitaet) +
      Number(ernaehrung) +
      Number(reibung_scherkraefte);

    const risikostufe =
      braden_score <= 9
        ? "sehr_hoch"
        : braden_score <= 12
        ? "hoch"
        : braden_score <= 14
        ? "maessig"
        : "kein_risiko";

    const { data: inserted, error } = await (supabase as any)
      .from("dekubitus_risiko")
      .insert({
        bewohner_id: id,
        anbieter_id: (anbieter as any).id,
        datum: datum ?? new Date().toISOString().split("T")[0],
        sensorische_wahrnehmung,
        feuchtigkeit,
        aktivitaet,
        mobilitaet,
        ernaehrung,
        reibung_scherkraefte,
        braden_score,
        risikostufe,
        vorhandene_laesionen,
        hautbefund,
        massnahmen,
        naechste_einschaetzung,
        erfasst_von: user.id,
      })
      .select()
      .single();

    if (error) {
      logger.error("POST /api/bewohner/[id]/dekubitus — insert dekubitus_risiko", { error });
      return NextResponse.json({ error: "Failed to create assessment" }, { status: 500 });
    }

    return NextResponse.json(inserted as any, { status: 201 });
  } catch (err) {
    logger.error("POST /api/bewohner/[id]/dekubitus", { error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

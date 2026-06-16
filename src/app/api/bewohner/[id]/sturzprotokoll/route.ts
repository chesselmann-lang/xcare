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

    const { data: _prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
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

    const url = new URL(req.url);
    const since = url.searchParams.get("since");
    const sinceDate =
      since ??
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [protokolleRes, risikoRes] = await Promise.all([
      (supabase as any)
        .from("sturzprotokolle")
        .select("*")
        .eq("bewohner_id", id)
        .eq("anbieter_id", (anbieter as any).id)
        .gte("datum", sinceDate)
        .order("datum", { ascending: false })
        .order("uhrzeit", { ascending: false }),
      (supabase as any)
        .from("sturzrisiko_einschaetzung")
        .select("*")
        .eq("bewohner_id", id)
        .eq("anbieter_id", (anbieter as any).id)
        .order("datum", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (protokolleRes.error) {
      logger.error("GET /api/bewohner/[id]/sturzprotokoll - protokolle", {
        error: protokolleRes.error,
      });
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    const protokolle = (protokolleRes.data ?? []) as any[];
    const letzteRisikoeinschaetzung = risikoRes.data ?? null;

    // Stats
    const gesamt = protokolle.length;
    const letzter12Monate = gesamt;
    const schwereSturzze = protokolle.filter(
      (p: any) => p.schweregrad === "mittel" || p.schweregrad === "schwer"
    ).length;
    const letzterSturz = protokolle.length > 0 ? protokolle[0].datum : null;

    const stats = {
      gesamt,
      letzter12Monate,
      schwereSturzze,
      letzterSturz,
      risikostufe: letzteRisikoeinschaetzung?.risikostufe ?? null,
    };

    return NextResponse.json({ protokolle, letzteRisikoeinschaetzung, stats });
  } catch (err) {
    logger.error("GET /api/bewohner/[id]/sturzprotokoll", { error: err });
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

    const { data: _prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
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

    // Risikoeinschätzung upsert
    if (body.type === "risiko") {
      const {
        type: _t,
        ...risikoFields
      } = body;

      const insertData = {
        ...risikoFields,
        bewohner_id: id,
        anbieter_id: (anbieter as any).id,
        erfasst_von: user.id,
      };

      const { data, error } = await (supabase as any)
        .from("sturzrisiko_einschaetzung")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        logger.error("POST /api/bewohner/[id]/sturzprotokoll - risiko", { error });
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
      }

      return NextResponse.json(data as any, { status: 201 });
    }

    // Standard Sturzprotokoll
    if (!body.ort) {
      return NextResponse.json({ error: "ort is required" }, { status: 400 });
    }

    const insertData = {
      ...body,
      type: undefined,
      bewohner_id: id,
      anbieter_id: (anbieter as any).id,
      erfasst_von: user.id,
    };
    delete insertData.type;

    const { data, error } = await (supabase as any)
      .from("sturzprotokolle")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error("POST /api/bewohner/[id]/sturzprotokoll - insert", { error });
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    return NextResponse.json(data as any, { status: 201 });
  } catch (err) {
    logger.error("POST /api/bewohner/[id]/sturzprotokoll", { error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
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

    const { data: _prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
    const { data: anbieter } = await (supabase as any)
      .from("anbieter")
      .select("id")
      .eq("profile_id", _prof?.id ?? "")
      .single();
    if (!anbieter) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const url = new URL(req.url);
    const protokollId = url.searchParams.get("protokoll_id");
    if (!protokollId) {
      return NextResponse.json({ error: "protokoll_id required" }, { status: 400 });
    }

    const { error } = await (supabase as any)
      .from("sturzprotokolle")
      .delete()
      .eq("id", protokollId)
      .eq("bewohner_id", id)
      .eq("anbieter_id", (anbieter as any).id);

    if (error) {
      logger.error("DELETE /api/bewohner/[id]/sturzprotokoll", { error });
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("DELETE /api/bewohner/[id]/sturzprotokoll", { error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

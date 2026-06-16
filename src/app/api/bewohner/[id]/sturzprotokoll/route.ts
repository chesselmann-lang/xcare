import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const MEDICAL_RATE_LIMIT = { limit: 60, window: 60 };

async function resolveAnbieter(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: prof } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .single();
  const { data: anbieter } = await (supabase as any)
    .from("anbieter")
    .select("id")
    .eq("profile_id", prof?.id ?? "")
    .single();
  return anbieter as { id: string } | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await rateLimit(req, MEDICAL_RATE_LIMIT);
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieter = await resolveAnbieter(supabase, user.id);
    if (!anbieter) return NextResponse.json({ error: "Kein Anbieter" }, { status: 403 });

    const url = new URL(req.url);
    const since = url.searchParams.get("since") ??
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Cursor pagination
    const cursor = url.searchParams.get("cursor");
    const pageSize = Math.min(Number(url.searchParams.get("limit") ?? "100"), 200);
    const isExport = url.searchParams.get("export") === "csv";

    let protokolleQuery = (supabase as any)
      .from("sturzprotokolle")
      .select("id,datum,uhrzeit,ort,schweregrad,umstaende,verletzungen,massnahmen_sofort,arzt_informiert,created_at")
      .eq("bewohner_id", id)
      .eq("anbieter_id", anbieter.id)
      .gte("datum", since)
      .order("datum", { ascending: false })
      .order("id", { ascending: false })
      .limit(pageSize + 1);

    if (cursor) protokolleQuery = protokolleQuery.lt("datum", cursor);

    const [protokolleRes, risikoRes] = await Promise.all([
      protokolleQuery,
      (supabase as any)
        .from("sturzrisiko_einschaetzung")
        .select("id,datum,risikostufe,gesamtscore,massnahmen")
        .eq("bewohner_id", id)
        .eq("anbieter_id", anbieter.id)
        .order("datum", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (protokolleRes.error) {
      logger.error("GET sturzprotokoll query error", { bewohnerId: id, error: protokolleRes.error.message });
      return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
    }

    const rawProtokolle = (protokolleRes.data ?? []) as any[];
    const hasNextPage = rawProtokolle.length > pageSize;
    const protokolle = hasNextPage ? rawProtokolle.slice(0, pageSize) : rawProtokolle;
    const nextCursor = hasNextPage ? protokolle[protokolle.length - 1]?.datum : null;

    const letzteRisikoeinschaetzung = risikoRes.data ?? null;

    // CSV export
    if (isExport) {
      const rows = [
        ["Datum", "Uhrzeit", "Ort", "Schweregrad", "Verletzungen", "Arzt informiert"],
        ...protokolle.map((p: any) => [
          p.datum,
          p.uhrzeit ?? "",
          p.ort ?? "",
          p.schweregrad ?? "",
          (p.verletzungen ?? "").replace(/\n/g, " "),
          p.arzt_informiert ? "Ja" : "Nein",
        ]),
      ];
      const csv = rows.map((r) => r.join(";")).join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="sturzprotokoll-${id}-${new Date().toISOString().split("T")[0]}.csv"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const schwereZu = protokolle.filter(
      (p: any) => p.schweregrad === "mittel" || p.schweregrad === "schwer" || p.schweregrad === "kritisch"
    ).length;

    const stats = {
      gesamt: protokolle.length,
      schwereSturzze: schwereZu,
      letzterSturz: protokolle.length > 0 ? (protokolle[0] as any).datum : null,
      risikostufe: letzteRisikoeinschaetzung?.risikostufe ?? null,
    };

    const headers = new Headers({ "Cache-Control": "private, no-store" });
    headers.set("X-RateLimit-Remaining", String(rl.remaining));

    return NextResponse.json(
      { protokolle, letzteRisikoeinschaetzung, stats, nextCursor, hasNextPage },
      { headers }
    );
  } catch (e: unknown) {
    logger.error("GET sturzprotokoll unexpected error", { error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await rateLimit(req, { limit: 30, window: 60 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieter = await resolveAnbieter(supabase, user.id);
    if (!anbieter) return NextResponse.json({ error: "Kein Anbieter" }, { status: 403 });

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
    }

    if (body.type === "risiko") {
      const { type: _t, ...risikoFields } = body;
      const { data, error } = await (supabase as any)
        .from("sturzrisiko_einschaetzung")
        .insert({ ...risikoFields, bewohner_id: id, anbieter_id: anbieter.id, erfasst_von: user.id })
        .select()
        .single();
      if (error) {
        logger.error("POST sturzrisiko insert error", { bewohnerId: id, error: error.message });
        return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
      }
      return NextResponse.json(data as Record<string, unknown>, { status: 201 });
    }

    const { type: _t, ...protokollData } = body;
    const { data, error } = await (supabase as any)
      .from("sturzprotokolle")
      .insert({ ...protokollData, bewohner_id: id, anbieter_id: anbieter.id, erfasst_von: user.id })
      .select()
      .single();

    if (error) {
      logger.error("POST sturzprotokoll insert error", { bewohnerId: id, error: error.message });
      return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
    }
    return NextResponse.json(data as Record<string, unknown>, { status: 201 });
  } catch (e: unknown) {
    logger.error("POST sturzprotokoll unexpected error", { error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await rateLimit(req, { limit: 10, window: 60 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieter = await resolveAnbieter(supabase, user.id);
    if (!anbieter) return NextResponse.json({ error: "Kein Anbieter" }, { status: 403 });

    const url = new URL(req.url);
    const protokollId = url.searchParams.get("protokoll_id");
    if (!protokollId) return NextResponse.json({ error: "protokoll_id erforderlich" }, { status: 400 });

    const { error } = await (supabase as any)
      .from("sturzprotokolle")
      .delete()
      .eq("id", protokollId)
      .eq("bewohner_id", id)
      .eq("anbieter_id", anbieter.id);

    if (error) {
      logger.error("DELETE sturzprotokoll error", { protokollId, bewohnerId: id, error: error.message });
      return NextResponse.json({ error: "Fehler beim Löschen" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    logger.error("DELETE sturzprotokoll unexpected error", { error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

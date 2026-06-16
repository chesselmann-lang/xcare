import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await rateLimit(request, MEDICAL_RATE_LIMIT);
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  const { id: bewohnerId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const anbieter = await resolveAnbieter(supabase, user.id);
  if (!anbieter) return NextResponse.json({ error: "Kein Anbieter" }, { status: 403 });

  const url = new URL(request.url);
  const since =
    url.searchParams.get("since") ??
    new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Cursor pagination
  const cursor = url.searchParams.get("cursor");
  const pageSize = Math.min(Number(url.searchParams.get("limit") ?? "100"), 200);

  let gewichtQuery = (supabase as any)
    .from("gewichts_eintraege")
    .select("id,datum,uhrzeit,gewicht_kg,bmi,zustand,notizen,created_at")
    .eq("bewohner_id", bewohnerId)
    .eq("anbieter_id", anbieter.id)
    .gte("datum", since)
    .order("datum", { ascending: true })
    .order("id", { ascending: true })
    .limit(pageSize + 1);

  if (cursor) gewichtQuery = gewichtQuery.gt("datum", cursor);

  // Export: ?export=csv
  const isExport = url.searchParams.get("export") === "csv";

  const [gewichtRes, vitalRes, normwerteRes] = await Promise.all([
    gewichtQuery,
    (supabase as any)
      .from("vitalwerte_eintraege")
      .select("id,datum,uhrzeit,blutdruck_systolisch,blutdruck_diastolisch,herzfrequenz,temperatur,sauerstoffsaettigung,notizen")
      .eq("bewohner_id", bewohnerId)
      .eq("anbieter_id", anbieter.id)
      .gte("datum", since)
      .order("datum", { ascending: false }),
    (supabase as any)
      .from("bewohner_normwerte")
      .select("*")
      .eq("bewohner_id", bewohnerId)
      .maybeSingle(),
  ]);

  const rawEintraege = (gewichtRes.data ?? []) as any[];
  const hasNextPage = rawEintraege.length > pageSize;
  const eintraege = hasNextPage ? rawEintraege.slice(0, pageSize) : rawEintraege;
  const nextCursor = hasNextPage ? eintraege[eintraege.length - 1]?.datum : null;

  const vitalwerte = (vitalRes.data ?? []) as any[];
  const normwerte = normwerteRes.data ?? null;

  // CSV export
  if (isExport) {
    const rows = [
      ["Datum", "Uhrzeit", "Gewicht (kg)", "BMI", "Zustand", "Notizen"],
      ...eintraege.map((e: any) => [
        e.datum,
        e.uhrzeit ?? "",
        e.gewicht_kg,
        e.bmi ?? "",
        e.zustand ?? "",
        (e.notizen ?? "").replace(/\n/g, " "),
      ]),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="gewichtsverlauf-${bewohnerId}-${new Date().toISOString().split("T")[0]}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const gewichte = eintraege.map((e: any) => e.gewicht_kg as number);
  const aktuellesGewicht = gewichte.length > 0 ? gewichte[gewichte.length - 1] : null;
  const erstesGewicht = gewichte.length > 0 ? gewichte[0] : null;
  const gewichtDelta =
    aktuellesGewicht !== null && erstesGewicht !== null
      ? Math.round((aktuellesGewicht - erstesGewicht) * 10) / 10
      : null;

  const stats = {
    aktuellesGewicht,
    gewichtDelta,
    anzahlMessungen: gewichte.length,
    letzteMessung: eintraege.length > 0 ? (eintraege[eintraege.length - 1] as any).datum : null,
    letzteVital: vitalwerte.length > 0 ? vitalwerte[0] : null,
  };

  const headers = new Headers({ "Cache-Control": "private, no-store" });
  headers.set("X-RateLimit-Remaining", String(rl.remaining));

  return NextResponse.json(
    { eintraege, vitalwerte, normwerte, stats, nextCursor, hasNextPage },
    { headers }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await rateLimit(request, { limit: 30, window: 60 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  const { id: bewohnerId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const anbieter = await resolveAnbieter(supabase, user.id);
  if (!anbieter) return NextResponse.json({ error: "Kein Anbieter" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const anbieterId = anbieter.id;

  if (body.type === "vital") {
    const { type: _t, ...vitalData } = body;
    const { data, error } = await (supabase as any)
      .from("vitalwerte_eintraege")
      .insert({ ...vitalData, bewohner_id: bewohnerId, anbieter_id: anbieterId, erfasst_von: user.id })
      .select()
      .single();
    if (error) {
      logger.error("vital insert error", { bewohnerId: bewohnerId, error: error.message });
      return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
    }
    return NextResponse.json({ vital: data }, { status: 201 });
  }

  if (body.type === "normwerte") {
    const { type: _t, ...normData } = body;
    const { data, error } = await (supabase as any)
      .from("bewohner_normwerte")
      .upsert({ ...normData, bewohner_id: bewohnerId, anbieter_id: anbieterId }, { onConflict: "bewohner_id" })
      .select()
      .single();
    if (error) {
      logger.error("normwerte upsert error", { bewohnerId: bewohnerId, error: error.message });
      return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
    }
    return NextResponse.json({ normwerte: data }, { status: 200 });
  }

  // Default: gewichts_eintraege
  if (!body.gewicht_kg) {
    return NextResponse.json({ error: "gewicht_kg ist erforderlich" }, { status: 400 });
  }

  const { type: _t, ...gewichtData } = body;
  const { data, error } = await (supabase as any)
    .from("gewichts_eintraege")
    .insert({ ...gewichtData, bewohner_id: bewohnerId, anbieter_id: anbieterId, erfasst_von: user.id })
    .select()
    .single();
  if (error) {
    logger.error("gewicht insert error", { bewohnerId: bewohnerId, error: error.message });
    return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
  }
  return NextResponse.json({ eintrag: data }, { status: 201 });
}

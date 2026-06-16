import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const MEDICAL_RATE_LIMIT = { limit: 60, window: 60 }; // 60 req/min per IP

// ── Shared anbieter-lookup helper ─────────────────────────────────────────────
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
  // Rate limit
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
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Cursor-based pagination
  const cursor = url.searchParams.get("cursor"); // ISO date string (last seen datum)
  const pageSize = Math.min(Number(url.searchParams.get("limit") ?? "100"), 200);

  let eintraegeQuery = (supabase as any)
    .from("schmerz_eintraege")
    .select("id,datum,uhrzeit,nrs_wert,lokalisation,charakter,begleiterscheinungen,massnahmen,massnahmen_wirkung,notizen,created_at")
    .eq("bewohner_id", bewohnerId)
    .eq("anbieter_id", anbieter.id)
    .gte("datum", since)
    .order("datum", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1); // +1 to detect next page

  if (cursor) {
    eintraegeQuery = eintraegeQuery.lt("datum", cursor);
  }

  const [eintraegeRes, latestAssessmentRes] = await Promise.all([
    eintraegeQuery,
    (supabase as any)
      .from("schmerz_assessments")
      .select("id,datum,instrument,gesamtscore,zielwert_nrs,massnahmenplan,naechste_bewertung")
      .eq("bewohner_id", bewohnerId)
      .eq("anbieter_id", anbieter.id)
      .order("datum", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const rawEintraege = (eintraegeRes.data ?? []) as any[];
  const hasNextPage = rawEintraege.length > pageSize;
  const eintraege = hasNextPage ? rawEintraege.slice(0, pageSize) : rawEintraege;
  const nextCursor = hasNextPage ? eintraege[eintraege.length - 1]?.datum : null;

  const latestAssessment = latestAssessmentRes.data ?? null;

  const nrsWerte = eintraege.map((e: any) => e.nrs_wert as number);
  const avgNrs =
    nrsWerte.length > 0
      ? Math.round((nrsWerte.reduce((a: number, b: number) => a + b, 0) / nrsWerte.length) * 10) / 10
      : null;
  const maxNrs = nrsWerte.length > 0 ? Math.max(...nrsWerte) : null;

  const stats = {
    gesamt: eintraege.length,
    avgNrs,
    maxNrs,
    hochschmerzEintraege: eintraege.filter((e: any) => (e.nrs_wert as number) >= 7).length,
    letzterEintrag: eintraege.length > 0 ? (eintraege[0] as any).datum : null,
  };

  const headers = new Headers({ "Cache-Control": "private, no-store" });
  headers.set("X-RateLimit-Remaining", String(rl.remaining));
  headers.set("X-RateLimit-Reset", String(rl.resetAt));

  return NextResponse.json(
    { eintraege, latestAssessment, stats, nextCursor, hasNextPage },
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

  if (body.type === "assessment") {
    const { type: _t, ...assessmentData } = body;
    const { data, error } = await (supabase as any)
      .from("schmerz_assessments")
      .insert({ ...assessmentData, bewohner_id: bewohnerId, anbieter_id: anbieterId, erfasst_von: user.id })
      .select()
      .single();
    if (error) {
      logger.error("schmerz assessment insert error", { bewohnerId: bewohnerId, error: error.message });
      return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
    }
    return NextResponse.json({ assessment: data }, { status: 201 });
  }

  if (body.nrs_wert === undefined || body.nrs_wert === null) {
    return NextResponse.json({ error: "NRS-Wert ist erforderlich" }, { status: 400 });
  }

  const { type: _t, ...eintragData } = body;
  const { data, error } = await (supabase as any)
    .from("schmerz_eintraege")
    .insert({ ...eintragData, bewohner_id: bewohnerId, anbieter_id: anbieterId, erfasst_von: user.id })
    .select()
    .single();
  if (error) {
    logger.error("schmerz eintrag insert error", { bewohnerId: bewohnerId, error: error.message });
    return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
  }
  return NextResponse.json({ eintrag: data }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await rateLimit(request, { limit: 10, window: 60 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  const { id: bewohnerId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const anbieter = await resolveAnbieter(supabase, user.id);
  if (!anbieter) return NextResponse.json({ error: "Kein Anbieter" }, { status: 403 });

  const url = new URL(request.url);
  const eintragId = url.searchParams.get("eintrag_id");
  if (!eintragId) return NextResponse.json({ error: "eintrag_id fehlt" }, { status: 400 });

  const { error } = await (supabase as any)
    .from("schmerz_eintraege")
    .delete()
    .eq("id", eintragId)
    .eq("bewohner_id", bewohnerId)
    .eq("anbieter_id", anbieter.id);

  if (error) {
    logger.error("schmerz delete error", { eintragId, bewohnerId: bewohnerId, error: error.message });
    return NextResponse.json({ error: "Fehler beim Löschen" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validate";
import { logger } from "@/lib/logger";

/** CORS headers for the embed widget — allows any origin to read public ratings */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * GET /api/widget/bewertungen/[id]
 *
 * Public, unauthenticated endpoint. Returns a JSON summary of the
 * provider's ratings for use in the embeddable review widget.
 *
 * Response:
 * {
 *   anbieter: { id, name },
 *   durchschnitt: number,
 *   anzahl: number,
 *   sterne: { 1: n, 2: n, 3: n, 4: n, 5: n },
 *   neueste: [ { sterne, kommentar, created_at } ]
 * }
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isUuid(id)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400, headers: CORS });
    }

    const supabase = await createClient();

    // Fetch anbieter (must be verified + active)
    const { data: anbieter } = await supabase
      .from("anbieter")
      .select("id, name, verifiziert")
      .eq("id", id)
      .single();

    if (!anbieter) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404, headers: CORS });
    }

    // Fetch published ratings
    const { data: bewertungen, error } = await supabase
      .from("bewertungen")
      .select("sterne, kommentar, created_at")
      .eq("anbieter_id", id)
      .eq("moderiert", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const rows = bewertungen ?? [];
    const anzahl = rows.length;
    const durchschnitt =
      anzahl > 0 ? rows.reduce((s, r) => s + r.sterne, 0) / anzahl : 0;

    // Distribution
    const sterne: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of rows) sterne[r.sterne] = (sterne[r.sterne] ?? 0) + 1;

    // Latest 3 with text
    const neueste = rows
      .filter((r) => r.kommentar)
      .slice(0, 3)
      .map((r) => ({ sterne: r.sterne, kommentar: r.kommentar, created_at: r.created_at }));

    return NextResponse.json(
      {
        anbieter: { id: anbieter.id, name: anbieter.name },
        durchschnitt: Math.round(durchschnitt * 10) / 10,
        anzahl,
        sterne,
        neueste,
      },
      { headers: CORS }
    );
  } catch (err) {
    logger.error("GET /api/widget/bewertungen/[id] failed", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500, headers: CORS });
  }
}

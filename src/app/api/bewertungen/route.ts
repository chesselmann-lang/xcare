import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// GET ?anbieter_id=<uuid>
// Returns all visible ratings for an Anbieter with score averages
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const anbieter_id = searchParams.get("anbieter_id");

  if (!anbieter_id) {
    return NextResponse.json({ error: "anbieter_id erforderlich" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: bewertungen, error } = await supabase
    .from("bewertungen")
    .select(
      "id, gesamt_score, zuverlaessigkeit, fachkompetenz, freundlichkeit, kommunikation, pünktlichkeit, kommentar, verifiziert, anbieter_antwort, anbieter_antwort_am, created_at"
    )
    .eq("anbieter_id", anbieter_id)
    .eq("sichtbar", true)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("GET /api/bewertungen error", { error: error.message });
    return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
  }

  // Aggregated scores
  const list = bewertungen ?? [];
  const anzahl = list.length;
  const verifizierte = list.filter((b) => b.verifiziert).length;

  const avg = (field: keyof typeof list[0]) =>
    anzahl > 0
      ? Math.round(
          (list.reduce((s, b) => s + Number(b[field] ?? 0), 0) / anzahl) * 100
        ) / 100
      : null;

  const scores = {
    durchschnitt: avg("gesamt_score"),
    anzahl_bewertungen: anzahl,
    verifizierte_bewertungen: verifizierte,
    avg_zuverlaessigkeit: avg("zuverlaessigkeit"),
    avg_fachkompetenz: avg("fachkompetenz"),
    avg_freundlichkeit: avg("freundlichkeit"),
    avg_kommunikation: avg("kommunikation"),
    avg_pünktlichkeit: avg("pünktlichkeit"),
  };

  return NextResponse.json({ bewertungen: list, scores });
}

// POST — create new Bewertung
// Body: { buchung_id, anbieter_id, zuverlaessigkeit, fachkompetenz, freundlichkeit, kommunikation, pünktlichkeit, kommentar? }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    const body = await request.json();
    const {
      buchung_id,
      anbieter_id,
      zuverlaessigkeit,
      fachkompetenz,
      freundlichkeit,
      kommunikation,
      pünktlichkeit,
      kommentar,
    } = body;

    // Validate required scores
    const scores = { zuverlaessigkeit, fachkompetenz, freundlichkeit, kommunikation, pünktlichkeit };
    for (const [key, val] of Object.entries(scores)) {
      if (!Number.isInteger(val) || val < 1 || val > 5) {
        return NextResponse.json(
          { error: `${key} muss zwischen 1 und 5 liegen` },
          { status: 400 }
        );
      }
    }

    if (kommentar && kommentar.length > 1000) {
      return NextResponse.json(
        { error: "Kommentar darf maximal 1000 Zeichen haben" },
        { status: 400 }
      );
    }

    if (!anbieter_id) {
      return NextResponse.json({ error: "anbieter_id erforderlich" }, { status: 400 });
    }

    // Verify buchung exists, is abgeschlossen, and belongs to this user
    if (buchung_id) {
      const { data: buchung } = await supabase
        .from("buchungen")
        .select("id, status, familie_id")
        .eq("id", buchung_id)
        .single();

      if (!buchung) {
        return NextResponse.json({ error: "Buchung nicht gefunden" }, { status: 404 });
      }

      if (buchung.status !== "abgeschlossen") {
        return NextResponse.json(
          { error: "Bewertung nur nach abgeschlossener Buchung möglich" },
          { status: 403 }
        );
      }

      if (buchung.familie_id !== user.id) {
        return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
      }

      // Check no rating yet for this buchung
      const { data: existing } = await supabase
        .from("bewertungen")
        .select("id")
        .eq("buchung_id", buchung_id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: "Für diese Buchung wurde bereits eine Bewertung abgegeben" },
          { status: 409 }
        );
      }
    }

    const { data: bewertung, error } = await supabase
      .from("bewertungen")
      .insert({
        buchung_id: buchung_id ?? null,
        bewerter_id: user.id,
        anbieter_id,
        zuverlaessigkeit,
        fachkompetenz,
        freundlichkeit,
        kommunikation,
        pünktlichkeit,
        kommentar: kommentar ?? null,
      })
      .select("id, gesamt_score")
      .single();

    if (error) {
      logger.error("POST /api/bewertungen error", { error: error.message });
      return NextResponse.json({ error: "Fehler beim Speichern" }, { status: 500 });
    }

    logger.info("POST /api/bewertungen: Bewertung erstellt", {
      bewertung_id: bewertung.id,
      anbieter_id,
    });

    return NextResponse.json({ ok: true, bewertung }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/bewertungen unexpected error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

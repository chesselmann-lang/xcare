// ============================================
// xcare — Matching API Route (Phase 3C)
// POST /api/matching
// ============================================

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rankAnbieter, type AnbieterRaw, type MatchingInput } from "@/lib/matching/engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const pflegegrad: number | undefined =
      typeof body.pflegegrad === "number" && body.pflegegrad >= 1 && body.pflegegrad <= 5
        ? body.pflegegrad
        : undefined;

    const lebenslage: string[] | undefined =
      Array.isArray(body.lebenslage) && body.lebenslage.length > 0
        ? body.lebenslage.filter((v: unknown) => typeof v === "string")
        : typeof body.lebenslage === "string" && body.lebenslage
        ? [body.lebenslage]
        : undefined;

    const plz: string | undefined =
      typeof body.plz === "string" && body.plz.trim() ? body.plz.trim() : undefined;

    const rawLimit = typeof body.limit === "number" ? body.limit : 5;
    const limit = Math.min(10, Math.max(1, rawLimit));

    const input: MatchingInput = { pflegegrad, lebenslage, plz };

    const supabase = await createClient();

    // Authentifizierung prüfen (anonyme Nutzer bekommen generische Ergebnisse)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Top 20 aktive Anbieter mit Leistungen laden
    const { data: anbieterRows, error } = await supabase
      .from("anbieter")
      .select(
        `
        id,
        name,
        beschreibung,
        kategorie,
        plz,
        ort,
        verified,
        aktiv,
        bewertung_schnitt,
        leistungen(
          titel,
          beschreibung,
          lebenslage,
          preis_von,
          preis_bis
        )
      `
      )
      .eq("aktiv", true)
      .order("bewertung_schnitt", { ascending: false, nullsFirst: false })
      .limit(20);

    if (error) {
      logger.error("[matching] DB error:", error.message);
      return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
    }

    if (!anbieterRows || anbieterRows.length === 0) {
      return NextResponse.json({ matches: [], total: 0, authenticated: !!user });
    }

    // Typen anpassen für die Engine
    const anbieterFuerEngine: AnbieterRaw[] = anbieterRows.map((row) => ({
      id: row.id,
      name: row.name,
      beschreibung: row.beschreibung ?? null,
      kategorie: Array.isArray(row.kategorie) ? (row.kategorie as string[]) : null,
      plz: row.plz ?? null,
      ort: row.ort ?? "",
      verified: row.verified ?? false,
      aktiv: row.aktiv ?? true,
      bewertung_schnitt: row.bewertung_schnitt ?? null,
      leistungen: Array.isArray(row.leistungen)
        ? (
            row.leistungen as Array<{
              titel: string;
              beschreibung: string | null;
              lebenslage: string | null;
              preis_von: number | null;
              preis_bis: number | null;
            }>
          ).map((l) => ({
            titel: l.titel,
            beschreibung: l.beschreibung ?? null,
            lebenslage: l.lebenslage ?? null,
            preis_von: l.preis_von ?? null,
            preis_bis: l.preis_bis ?? null,
          }))
        : [],
    }));

    const matches = rankAnbieter(anbieterFuerEngine, input, limit);

    return NextResponse.json({
      matches,
      total: matches.length,
      authenticated: !!user,
    });
  } catch (err) {
    logger.error("[matching] Unexpected error:", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

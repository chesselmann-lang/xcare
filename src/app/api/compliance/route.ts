import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const CheckSchema = z.object({
  bereich: z.enum(["pflegedoku","hygiene","medikamente","wundversorgung","sturzpraevention","ernaehrung","personal","datenschutz"]),
  kriterium: z.string().min(1).max(500),
  erfuellt: z.boolean().nullable().optional(),
  nachweis: z.string().max(2000).optional(),
  faellig_am: z.string().optional(),
});

/**
 * GET /api/compliance — Anbieter holt seine Compliance-Checks
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();

    const url = new URL(req.url);
    const bereich = url.searchParams.get("bereich");

    if (profile?.role === "anbieter") {
      const { data: anbieter } = await supabase
        .from("anbieter").select("id").eq("profile_id", profile.id).single();
      if (!anbieter) return NextResponse.json([]);

      let query = supabase
        .from("compliance_checks")
        .select("*")
        .eq("anbieter_id", anbieter.id)
        .order("faellig_am", { ascending: true });

      if (bereich) query = query.eq("bereich", bereich);

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json(data ?? []);
    }

    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  } catch (err) {
    logger.error("compliance GET error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/**
 * POST /api/compliance — Erstellt einen neuen Compliance-Check
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (profile?.role !== "anbieter") return NextResponse.json({ error: "Nur für Anbieter" }, { status: 403 });

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Anbieter nicht gefunden" }, { status: 404 });

    const body = await req.json();
    const parsed = CheckSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    const d = parsed.data;

    const { data: check, error } = await supabase
      .from("compliance_checks")
      .insert({
        anbieter_id: anbieter.id,
        bereich: d.bereich,
        kriterium: d.kriterium,
        erfuellt: d.erfuellt ?? null,
        nachweis: d.nachweis ?? null,
        faellig_am: d.faellig_am ?? null,
        letzte_pruefung: d.erfuellt ? new Date().toISOString().slice(0, 10) : null,
        erstellt_von: profile.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(check, { status: 201 });
  } catch (err) {
    logger.error("compliance POST error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const CreateSchema = z.object({
  care_worker_id: z.string().uuid(),
  familie_profile_id: z.string().uuid().optional(),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  stunden: z.number().positive().max(24),
  stundensatz_ct: z.number().int().positive(),
  beschreibung: z.string().max(500).optional(),
});

/**
 * GET /api/stripe/stunden
 * Anbieter: eigene Stundennachweise; Familie: zugeordnete Stunden.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);

    let query = supabase
      .from("stundennachweise")
      .select(`
        id, datum, stunden, stundensatz_ct, betrag_ct, beschreibung, status,
        payment_status, created_at, approved_at, paid_at,
        care_worker_id,
        care_workers (vorname, nachname, qualifikationen),
        familie_profile_id,
        profiles!stundennachweise_familie_profile_id_fkey (vorname, nachname, email)
      `)
      .order("datum", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);

    if (profile.role === "anbieter") {
      const { data: anbieter } = await supabase
        .from("anbieter").select("id").eq("profile_id", profile.id).single();
      if (!anbieter) return NextResponse.json([]);
      query = query.eq("anbieter_id", anbieter.id);
    } else {
      query = query.eq("familie_profile_id", profile.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error("stunden GET error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/**
 * POST /api/stripe/stunden
 * Anbieter legt neuen Stundennachweis an.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (profile?.role !== "anbieter") {
      return NextResponse.json({ error: "Nur für Anbieter" }, { status: 403 });
    }

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Anbieter nicht gefunden" }, { status: 404 });

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }
    const d = parsed.data;

    // Sicherstellen dass care_worker zum Anbieter gehört
    const { data: worker } = await supabase
      .from("care_workers")
      .select("id, stundensatz_ct")
      .eq("id", d.care_worker_id)
      .eq("anbieter_id", anbieter.id)
      .single();
    if (!worker) return NextResponse.json({ error: "Pflegekraft nicht gefunden" }, { status: 404 });

    const { data: nachweis, error } = await supabase
      .from("stundennachweise")
      .insert({
        anbieter_id: anbieter.id,
        care_worker_id: d.care_worker_id,
        familie_profile_id: d.familie_profile_id ?? null,
        datum: d.datum,
        stunden: d.stunden,
        stundensatz_ct: d.stundensatz_ct,
        beschreibung: d.beschreibung ?? null,
        status: d.familie_profile_id ? "pending" : "approved", // ohne Familie direkt approved
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(nachweis, { status: 201 });
  } catch (err) {
    logger.error("stunden POST error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

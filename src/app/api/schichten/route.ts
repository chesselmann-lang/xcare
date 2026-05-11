import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const CreateSchema = z.object({
  care_worker_id: z.string().uuid(),
  familie_profile_id: z.string().uuid().optional(),
  start_ts: z.string().datetime(),
  ende_ts: z.string().datetime(),
  titel: z.string().max(200).optional(),
  beschreibung: z.string().max(2000).optional(),
  schichttyp: z.enum(["standard", "nacht", "bereitschaft", "springerdienst"]).default("standard"),
  stundensatz_ct: z.number().int().min(0).max(100000).optional(),
});

/**
 * GET /api/schichten?von=&bis=&care_worker_id=&familie_profile_id=
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
    const von = url.searchParams.get("von");
    const bis = url.searchParams.get("bis");
    const careWorkerId = url.searchParams.get("care_worker_id");
    const familieId = url.searchParams.get("familie_profile_id");

    let query = supabase
      .from("schichten")
      .select(`
        id, start_ts, ende_ts, titel, beschreibung, schichttyp, status,
        stunden_geplant, stundensatz_ct, bestaetigt_am, abgesagt_am, absage_grund,
        care_worker_id, familie_profile_id,
        care_workers (vorname, nachname, stundensatz_ct),
        profiles!schichten_familie_profile_id_fkey (vorname, nachname)
      `)
      .order("start_ts", { ascending: true });

    if (von) query = query.gte("start_ts", von);
    if (bis) query = query.lte("start_ts", bis + "T23:59:59Z");
    if (careWorkerId) query = query.eq("care_worker_id", careWorkerId);

    if (profile.role === "anbieter") {
      const { data: anbieter } = await supabase
        .from("anbieter").select("id").eq("profile_id", profile.id).single();
      if (!anbieter) return NextResponse.json([]);
      query = query.eq("anbieter_id", anbieter.id);
      if (familieId) query = query.eq("familie_profile_id", familieId);
    } else {
      query = query.eq("familie_profile_id", profile.id);
    }

    const { data, error } = await query.limit(500);
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error("schichten GET error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/**
 * POST /api/schichten
 * Anbieter legt neue Schicht an.
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
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    const d = parsed.data;

    // Prüfe: care_worker gehört zum Anbieter
    const { data: worker } = await supabase
      .from("care_workers")
      .select("id, stundensatz_ct")
      .eq("id", d.care_worker_id)
      .eq("anbieter_id", anbieter.id)
      .single();
    if (!worker) return NextResponse.json({ error: "Pflegekraft nicht gefunden" }, { status: 404 });

    // Zeitvalidierung
    if (new Date(d.ende_ts) <= new Date(d.start_ts)) {
      return NextResponse.json({ error: "Endzeit muss nach Startzeit liegen" }, { status: 422 });
    }

    const { data: schicht, error } = await supabase
      .from("schichten")
      .insert({
        anbieter_id: anbieter.id,
        care_worker_id: d.care_worker_id,
        familie_profile_id: d.familie_profile_id ?? null,
        start_ts: d.start_ts,
        ende_ts: d.ende_ts,
        titel: d.titel ?? null,
        beschreibung: d.beschreibung ?? null,
        schichttyp: d.schichttyp,
        stundensatz_ct: d.stundensatz_ct ?? worker.stundensatz_ct,
        erstellt_von: profile.id,
        status: "geplant",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(schicht, { status: 201 });
  } catch (err) {
    logger.error("schichten POST error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

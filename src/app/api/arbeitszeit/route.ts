import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const PostSchema = z.object({
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  beginn: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  ende: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  pause_min: z.number().int().min(0).max(480).default(0),
  taetigkeit: z.string().min(1).max(500),
  kategorie: z.enum(["pflege","hauswirtschaft","begleitung","verwaltung","sonstiges"]).default("pflege"),
  familie_profile_id: z.string().uuid().optional(),
  care_worker_id: z.string().uuid().optional(),
  notiz: z.string().max(1000).optional(),
});

/** GET /api/arbeitszeit?von=YYYY-MM-DD&bis=YYYY-MM-DD&worker=uuid */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const von = searchParams.get("von");
    const bis = searchParams.get("bis");
    const workerFilter = searchParams.get("worker");

    let query = supabase
      .from("arbeitszeit")
      .select(`id, datum, beginn, ende, pause_min, taetigkeit, kategorie, status, notiz, created_at,
        care_worker_id,
        familie_profile:familie_profile_id(vorname, nachname),
        worker:care_worker_id(vorname, nachname),
        erstellt_von_profil:erstellt_von(vorname, nachname)`)
      .order("datum", { ascending: false })
      .order("beginn", { ascending: false })
      .limit(200);

    if (profile.role === "anbieter") {
      const { data: anbieter } = await supabase
        .from("anbieter").select("id").eq("profile_id", profile.id).single();
      if (!anbieter) return NextResponse.json({ error: "Anbieter nicht gefunden" }, { status: 404 });
      query = query.eq("anbieter_id", anbieter.id);
      if (workerFilter) query = query.eq("care_worker_id", workerFilter);
    } else if (profile.role === "familie") {
      query = query.eq("familie_profile_id", profile.id);
    } else {
      return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
    }

    if (von) query = query.gte("datum", von);
    if (bis) query = query.lte("datum", bis);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error("GET /api/arbeitszeit error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** POST /api/arbeitszeit */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (!profile || profile.role !== "anbieter") {
      return NextResponse.json({ error: "Nur Anbieter können Zeiten erfassen" }, { status: 403 });
    }

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Anbieter nicht gefunden" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validierungsfehler", details: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("arbeitszeit")
      .insert({
        ...parsed.data,
        anbieter_id: anbieter.id,
        erstellt_von: profile.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    logger.error("POST /api/arbeitszeit error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

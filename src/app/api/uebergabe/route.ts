import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const CreateSchema = z.object({
  familie_profile_id: z.string().uuid().optional(),
  care_worker_von: z.string().uuid().optional(),
  care_worker_bis: z.string().uuid().optional(),
  schicht_von_id: z.string().uuid().optional(),
  schicht_bis_id: z.string().uuid().optional(),
  allgemeinzustand: z.string().max(2000).optional(),
  besonderheiten: z.string().max(2000).optional(),
  offene_aufgaben: z.string().max(2000).optional(),
  medikamente_status: z.string().max(1000).optional(),
  vitalwerte_auffaellig: z.boolean().optional(),
  stimmung: z.enum(["gut","mittel","schlecht","unruhig"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });

    const url = new URL(req.url);
    const familieId = url.searchParams.get("familie_profile_id");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100);

    let query = supabase
      .from("uebergabeprotokolle")
      .select(`
        id, erstellt_am, allgemeinzustand, besonderheiten, offene_aufgaben,
        medikamente_status, vitalwerte_auffaellig, stimmung, bestaetigt, bestaetigt_am,
        familie_profile_id,
        care_workers_von:care_worker_von (vorname, nachname),
        care_workers_bis:care_worker_bis (vorname, nachname)
      `)
      .order("erstellt_am", { ascending: false })
      .limit(limit);

    if (profile.role === "anbieter") {
      const { data: anbieter } = await supabase
        .from("anbieter").select("id").eq("profile_id", profile.id).single();
      if (!anbieter) return NextResponse.json([]);
      query = query.eq("anbieter_id", anbieter.id);
      if (familieId) query = query.eq("familie_profile_id", familieId);
    } else {
      query = query.eq("familie_profile_id", profile.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error("uebergabe GET error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

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
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    const d = parsed.data;

    const { data: entry, error } = await supabase
      .from("uebergabeprotokolle")
      .insert({ anbieter_id: anbieter.id, ...d })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    logger.error("uebergabe POST error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

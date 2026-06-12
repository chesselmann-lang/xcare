import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const PostSchema = z.object({
  familie_profile_id: z.string().uuid(),
  titel: z.string().min(1).max(200),
  beschreibung: z.string().max(2000).optional(),
  bereich: z.enum(["koerperpflege","ernaehrung","mobilitaet","kognition","soziales","schmerz","wunden","medikamente","allgemein"]).default("allgemein"),
  prioritaet: z.enum(["niedrig","mittel","hoch","dringend"]).default("mittel"),
  zieldatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

async function getAnbieterId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data: profile } = await supabase.from("profiles").select("id, role").eq("user_id", userId).single();
  if (!profile || profile.role !== "anbieter") return null;
  const { data: anbieter } = await supabase.from("anbieter").select("id").eq("profile_id", profile.id).single();
  return anbieter?.id ?? null;
}

/** GET /api/pflegeziele?familie=<uuid> */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const familieId = sp.get("familie");
    const status = sp.get("status"); // optional filter

    const anbieterId = await getAnbieterId(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Nur für Anbieter" }, { status: 403 });

    let query = supabase
      .from("pflegeziele")
      .select(`
        id, titel, beschreibung, bereich, prioritaet, status, zieldatum, erreicht_am, created_at, updated_at,
        familie_profile_id,
        erstellt_von_profil:erstellt_von(vorname, nachname),
        pflegeziel_massnahmen(id, beschreibung, haeufigkeit, verantwortlich, erledigt, erledigt_am, sort_order),
        pflegeziel_evaluationen(id, datum, ergebnis, notiz, created_at)
      `)
      .eq("anbieter_id", anbieterId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (familieId) query = query.eq("familie_profile_id", familieId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error("GET /api/pflegeziele error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** POST /api/pflegeziele */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const anbieterId = await getAnbieterId(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Nur für Anbieter" }, { status: 403 });

    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();

    const body = await req.json().catch(() => null);
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validierungsfehler", details: parsed.error.flatten() }, { status: 400 });

    const { data, error } = await supabase
      .from("pflegeziele")
      .insert({ ...parsed.data, anbieter_id: anbieterId, erstellt_von: profile?.id })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    logger.error("POST /api/pflegeziele error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

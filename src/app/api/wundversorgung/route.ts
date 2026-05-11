import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const Schema = z.object({
  familie_profile_id: z.string().uuid().optional(),
  lokalisation: z.string().min(1).max(200),
  wundart: z.enum(["dekubitus", "ulcus_cruris", "diabetisches_fusssyndrom", "traumatisch", "operativ", "sonstige"]).default("sonstige"),
  wundgroesse_cm2: z.number().min(0).optional(),
  tiefe_grad: z.number().int().min(1).max(4).optional(),
  wundzustand: z.enum(["granulierend", "epithelisierend", "nekrotisch", "infiziert", "exsudierend", "trocken"]).optional(),
  exsudat: z.enum(["kein", "gering", "maessig", "stark"]).optional(),
  wundrand: z.string().max(500).optional(),
  massnahmen: z.string().max(2000).optional(),
  verbandsmaterial: z.string().max(500).optional(),
  naechster_verbandwechsel: z.string().optional(),
  schmerz_nrs: z.number().int().min(0).max(10).optional(),
  foto_url: z.string().url().optional(),
  notizen: z.string().max(2000).optional(),
  wunde_id: z.string().uuid().optional(), // für folgedokumentation
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();

    const url = new URL(req.url);
    const familieId = url.searchParams.get("familie_profile_id");
    const wundeId = url.searchParams.get("wunde_id");

    let query = supabase
      .from("wundversorgungen")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (wundeId) query = query.eq("wunde_id", wundeId);

    if (profile?.role === "anbieter") {
      const { data: anbieter } = await supabase
        .from("anbieter").select("id").eq("profile_id", profile!.id).single();
      if (!anbieter) return NextResponse.json([]);
      query = query.eq("anbieter_id", anbieter.id);
      if (familieId) query = query.eq("familie_profile_id", familieId);
    } else {
      query = query.eq("familie_profile_id", profile!.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error("wundversorgung GET error", { error: err instanceof Error ? err.message : String(err) });
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
    if (!profile) return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    const d = parsed.data;

    let familieProfileId = d.familie_profile_id;
    let anbieterId: string | null = null;

    if (profile.role === "anbieter") {
      if (!familieProfileId) return NextResponse.json({ error: "familie_profile_id erforderlich" }, { status: 422 });
      const { data: a } = await supabase.from("anbieter").select("id").eq("profile_id", profile.id).single();
      anbieterId = a?.id ?? null;
    } else {
      familieProfileId = profile.id;
    }

    const { data: entry, error } = await supabase
      .from("wundversorgungen")
      .insert({
        ...d,
        familie_profile_id: familieProfileId,
        anbieter_id: anbieterId,
        dokumentiert_von: profile.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    logger.error("wundversorgung POST error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

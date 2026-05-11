import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const Schema = z.object({
  familie_profile_id: z.string().uuid().optional(),
  erfasst_am: z.string().optional(),
  schlaf: z.number().int().min(1).max(5).optional(),
  schmerz: z.number().int().min(1).max(5).optional(),
  stimmung: z.number().int().min(1).max(5).optional(),
  mobilitaet: z.number().int().min(1).max(5).optional(),
  appetit: z.number().int().min(1).max(5).optional(),
  notiz: z.string().max(1000).optional(),
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
    const von = url.searchParams.get("von");
    const bis = url.searchParams.get("bis");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "90"), 365);

    let query = supabase
      .from("wohlbefinden")
      .select("id, erfasst_am, schlaf, schmerz, stimmung, mobilitaet, appetit, notiz, erfasst_von_rolle")
      .order("erfasst_am", { ascending: false })
      .limit(limit);

    if (von) query = query.gte("erfasst_am", von);
    if (bis) query = query.lte("erfasst_am", bis);

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
    logger.error("wohlbefinden GET error", { error: err instanceof Error ? err.message : String(err) });
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
      const { data: anbieter } = await supabase
        .from("anbieter").select("id").eq("profile_id", profile.id).single();
      anbieterId = anbieter?.id ?? null;
    } else {
      familieProfileId = profile.id;
    }

    const { data: entry, error } = await supabase
      .from("wohlbefinden")
      .upsert({
        familie_profile_id: familieProfileId,
        anbieter_id: anbieterId,
        erfasst_am: d.erfasst_am ?? new Date().toISOString().slice(0, 10),
        schlaf: d.schlaf ?? null,
        schmerz: d.schmerz ?? null,
        stimmung: d.stimmung ?? null,
        mobilitaet: d.mobilitaet ?? null,
        appetit: d.appetit ?? null,
        notiz: d.notiz ?? null,
        erfasst_von_rolle: profile.role === "anbieter" ? "anbieter" : "familie",
        erstellt_von: profile.id,
      }, { onConflict: "familie_profile_id,erfasst_am" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    logger.error("wohlbefinden POST error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

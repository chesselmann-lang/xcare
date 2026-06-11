import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const Schema = z.object({
  familie_profile_id: z.string().uuid().optional(),
  medikament_name: z.string().min(1).max(200),
  wirkstoff: z.string().max(200).optional(),
  staerke: z.string().max(100).optional(),
  darreichungsform: z.string().max(100).optional(),
  dosierung_morgens: z.number().min(0).optional(),
  dosierung_mittags: z.number().min(0).optional(),
  dosierung_abends: z.number().min(0).optional(),
  dosierung_nachts: z.number().min(0).optional(),
  einheit: z.string().max(50).optional(),
  mit_mahlzeit: z.boolean().optional(),
  dauermedikation: z.boolean().default(true),
  von_datum: z.string().optional(),
  bis_datum: z.string().optional(),
  verordnet_von: z.string().max(200).optional(),
  indikation: z.string().max(500).optional(),
  hinweise: z.string().max(1000).optional(),
  aktiv: z.boolean().default(true),
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
    const nurAktiv = url.searchParams.get("aktiv") !== "false";

    let query = supabase
      .from("medikamentenplaene")
      .select("*")
      .order("medikament_name");

    if (nurAktiv) query = query.eq("aktiv", true);

    if (profile?.role === "anbieter") {
      if (!familieId) return NextResponse.json([]);
      query = query.eq("familie_profile_id", familieId);
    } else {
      query = query.eq("familie_profile_id", profile!.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error("medikamente GET error", { error: err instanceof Error ? err.message : String(err) });
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
      .from("medikamentenplaene")
      .insert({
        ...d,
        familie_profile_id: familieProfileId,
        anbieter_id: anbieterId,
        erstellt_von: profile.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    logger.error("medikamente POST error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

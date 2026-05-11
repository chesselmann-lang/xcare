import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const Schema = z.object({
  familie_profile_id: z.string().uuid().optional(),
  typ: z.enum(["notiz","aufgabe","update","wichtig"]).default("notiz"),
  inhalt: z.string().min(1).max(2000),
  pinned: z.boolean().optional(),
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

    let targetId = familieId;
    if (profile?.role !== "anbieter") targetId = profile?.id;
    if (!targetId) return NextResponse.json([]);

    const { data, error } = await supabase
      .from("familie_pinnwand")
      .select(`id, typ, inhalt, erledigt, erledigt_am, pinned, erstellt_von_rolle, created_at,
        profiles!familie_pinnwand_erstellt_von_fkey (vorname, nachname)`)
      .eq("familie_profile_id", targetId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error("pinnwand GET error", { error: err instanceof Error ? err.message : String(err) });
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
    if (profile.role !== "anbieter") familieProfileId = profile.id;
    if (!familieProfileId) return NextResponse.json({ error: "familie_profile_id erforderlich" }, { status: 422 });

    const { data: entry, error } = await supabase
      .from("familie_pinnwand")
      .insert({
        familie_profile_id: familieProfileId,
        typ: d.typ,
        inhalt: d.inhalt,
        pinned: d.pinned ?? false,
        erstellt_von: profile.id,
        erstellt_von_rolle: profile.role === "anbieter" ? "anbieter" : "familie",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    logger.error("pinnwand POST error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

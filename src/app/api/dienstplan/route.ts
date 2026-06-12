import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const EintragSchema = z.object({
  mitarbeiter_profile_id: z.string().uuid(),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  schicht_beginn: z.string().regex(/^\d{2}:\d{2}$/),
  schicht_ende: z.string().regex(/^\d{2}:\d{2}$/),
  schichttyp: z.enum(["frueh", "spaet", "nacht", "bereitschaft", "frei"]).default("frueh"),
  qualifikation_erforderlich: z.string().max(100).optional(),
  notiz: z.string().max(500).optional(),
  ki_vorschlag: z.boolean().default(false),
});

const PostSchema = z.object({
  woche_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  optimierungsziel: z.enum(["ausgewogen", "kostenminimal", "qualitaetsmaximum", "ruhezeiten"]).default("ausgewogen"),
  eintraege: z.array(EintragSchema).max(200),
  ki_begruendung: z.string().max(2000).optional(),
});

/** GET /api/dienstplan?woche_start=2026-06-09 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (!profile || profile.role !== "anbieter") {
      return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
    }

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Anbieter nicht gefunden" }, { status: 404 });

    const url = new URL(req.url);
    const wocheStart = url.searchParams.get("woche_start");

    let query = supabase
      .from("dienstplan_vorschlaege")
      .select("id, woche_start, status, optimierungsziel, ki_begruendung, created_at")
      .eq("anbieter_id", anbieter.id)
      .order("woche_start", { ascending: false })
      .limit(20);

    if (wocheStart) query = query.eq("woche_start", wocheStart);

    const { data, error } = await query;
    if (error) throw error;

    // If specific week requested, also fetch eintraege
    if (wocheStart && data && data.length > 0) {
      const { data: eintraege } = await supabase
        .from("dienstplan_eintraege")
        .select("id, mitarbeiter_profile_id, datum, schicht_beginn, schicht_ende, schichttyp, qualifikation_erforderlich, notiz, ki_vorschlag, bestaetigt")
        .eq("vorschlag_id", data[0].id)
        .order("datum")
        .order("schicht_beginn");
      return NextResponse.json({ vorschlag: data[0], eintraege: eintraege ?? [] });
    }

    return NextResponse.json(data);
  } catch (err) {
    logger.error("GET /api/dienstplan error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** POST /api/dienstplan — create or replace week plan */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (!profile || profile.role !== "anbieter") {
      return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
    }

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Anbieter nicht gefunden" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validierungsfehler", details: parsed.error.flatten() }, { status: 400 });
    }

    const { woche_start, optimierungsziel, eintraege, ki_begruendung } = parsed.data;

    // Upsert Vorschlag
    const { data: vorschlag, error: vErr } = await supabase
      .from("dienstplan_vorschlaege")
      .upsert(
        { anbieter_id: anbieter.id, woche_start, optimierungsziel, ki_begruendung: ki_begruendung ?? null, erstellt_von: profile.id, status: "entwurf" },
        { onConflict: "anbieter_id,woche_start" }
      )
      .select()
      .single();
    if (vErr) throw vErr;

    // Replace all Eintraege for this Vorschlag
    await supabase.from("dienstplan_eintraege").delete().eq("vorschlag_id", vorschlag.id);

    if (eintraege.length > 0) {
      const rows = eintraege.map((e) => ({ ...e, vorschlag_id: vorschlag.id, anbieter_id: anbieter.id }));
      const { error: eErr } = await supabase.from("dienstplan_eintraege").insert(rows);
      if (eErr) throw eErr;
    }

    return NextResponse.json(vorschlag, { status: 201 });
  } catch (err) {
    logger.error("POST /api/dienstplan error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

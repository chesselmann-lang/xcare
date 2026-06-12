import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

async function getAnbieterId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("user_id", userId).single();
  if (!profile || profile.role !== "anbieter") return null;
  const { data: anbieter } = await supabase
    .from("anbieter").select("id").eq("profile_id", profile.id).single();
  return anbieter?.id ?? null;
}

const PostSchema = z.object({
  periode: z.string().regex(/^\d{4}-(Q[1-4]|M(0[1-9]|1[0-2]))$/),
  kategorie: z.enum(["pflege","dokumentation","zufriedenheit","sicherheit","personal","allgemein"]).default("allgemein"),
  indikator: z.string().min(1).max(200),
  wert: z.number(),
  einheit: z.string().max(20).default("%"),
  zielwert: z.number().optional(),
  bewertung: z.enum(["gut","akzeptabel","verbesserungsbedarf","kritisch","neutral"]).default("neutral"),
  trend: z.enum(["steigend","stabil","fallend"]).default("stabil"),
  notiz: z.string().max(1000).optional(),
  quelle: z.string().max(200).optional(),
});

/** GET /api/qualitaetsindikatoren?periode=2024-Q1&kategorie=pflege */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const anbieterId = await getAnbieterId(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Kein Anbieter" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const periode = searchParams.get("periode");
    const kategorie = searchParams.get("kategorie");

    let query = supabase
      .from("qualitaetsindikatoren")
      .select("*")
      .eq("anbieter_id", anbieterId)
      .order("periode", { ascending: false })
      .order("kategorie")
      .order("indikator")
      .limit(500);

    if (periode) query = query.eq("periode", periode);
    if (kategorie) query = query.eq("kategorie", kategorie);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error("GET /api/qualitaetsindikatoren error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** POST /api/qualitaetsindikatoren */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (!profile || profile.role !== "anbieter") return NextResponse.json({ error: "Kein Anbieter" }, { status: 403 });

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Anbieter nicht gefunden" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validierungsfehler", details: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("qualitaetsindikatoren")
      .upsert({
        anbieter_id: anbieter.id,
        erstellt_von: profile.id,
        ...parsed.data,
      }, { onConflict: "anbieter_id,periode,kategorie,indikator" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    logger.error("POST /api/qualitaetsindikatoren error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

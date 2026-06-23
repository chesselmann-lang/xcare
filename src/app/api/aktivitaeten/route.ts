import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

async function getAnbieter(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: prof } = await (supabase as any).from("profiles").select("id").eq("user_id", userId).single();
  const { data } = await (supabase as any).from("anbieter").select("id").eq("profile_id", prof?.id ?? "").single();
  return data?.id ?? null;
}

// GET /api/aktivitaeten — alle Angebote des Anbieters
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: rawData, error } = await (supabase as any)
      .from("aktivitaeten_angebote")
      .select("*")
      .eq("anbieter_id", anbieterId)
      .order("wochentag", { ascending: true })
      .order("uhrzeit", { ascending: true });

    if (error) throw error;
    const angebote = (rawData ?? []) as any[];

    const stats = {
      gesamt: angebote.length,
      aktiv: angebote.filter(a => a.aktiv).length,
      kategorien: [...new Set(angebote.map(a => a.kategorie))].length,
    };

    return NextResponse.json({ angebote, stats });
  } catch (err) {
    logger.error("GET /api/aktivitaeten", { error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/aktivitaeten — neues Angebot
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Ung�ltige Anfrage' }, { status: 400 }) }
    const { titel, beschreibung, kategorie, wochentag, uhrzeit, dauer_min, kapazitaet, ort, verantwortlich } = body;

    if (!titel?.trim()) {
      return NextResponse.json({ error: "Titel ist Pflichtfeld" }, { status: 400 });
    }

    const { data, error } = await (supabase as any)
      .from("aktivitaeten_angebote")
      .insert({
        anbieter_id: anbieterId,
        titel: titel.trim(),
        beschreibung: beschreibung || null,
        kategorie: kategorie ?? "sozial",
        wochentag: wochentag ?? null,
        uhrzeit: uhrzeit || null,
        dauer_min: dauer_min ?? 60,
        kapazitaet: kapazitaet || null,
        ort: ort || null,
        verantwortlich: verantwortlich || null,
        aktiv: true,
        erstellt_von: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ angebot: data }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/aktivitaeten", { error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

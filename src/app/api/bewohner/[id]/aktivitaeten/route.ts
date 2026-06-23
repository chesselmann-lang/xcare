import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

async function getAnbieter(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: prof } = await (supabase as any).from("profiles").select("id").eq("user_id", userId).single();
  const { data } = await (supabase as any).from("anbieter").select("id").eq("profile_id", prof?.id ?? "").single();
  return data?.id ?? null;
}

// GET /api/bewohner/[id]/aktivitaeten — Teilnahmen + passende Angebote
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: bewohnerId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [{ data: rawTeilnahmen }, { data: rawAngebote }] = await Promise.all([
      (supabase as any)
        .from("aktivitaeten_teilnahmen")
        .select("*, angebot:aktivitaeten_angebote(id, titel, kategorie)")
        .eq("bewohner_id", bewohnerId)
        .eq("anbieter_id", anbieterId)
        .order("datum", { ascending: false })
        .limit(100),
      (supabase as any)
        .from("aktivitaeten_angebote")
        .select("id, titel, kategorie, wochentag, uhrzeit, dauer_min, ort")
        .eq("anbieter_id", anbieterId)
        .eq("aktiv", true)
        .order("wochentag"),
    ]);

    const teilnahmen: any[] = rawTeilnahmen ?? [];
    const angebote: any[] = rawAngebote ?? [];

    const stats = {
      gesamt: teilnahmen.length,
      teilgenommen: teilnahmen.filter(t => t.teilgenommen).length,
      abgesagt: teilnahmen.filter(t => t.abgesagt).length,
      letzteAktivitaet: teilnahmen[0]?.datum ?? null,
    };

    return NextResponse.json({ teilnahmen, angebote, stats });
  } catch (err: unknown) {
    logger.error("GET /api/bewohner/[id]/aktivitaeten", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/bewohner/[id]/aktivitaeten — Teilnahme eintragen
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: bewohnerId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Ung�ltige Anfrage' }, { status: 400 }) }
    const { angebot_id, datum, teilgenommen, stimmung, beobachtungen, abgesagt, abgesagt_grund } = body;

    if (!angebot_id || !datum) {
      return NextResponse.json({ error: "angebot_id und datum sind Pflichtfelder" }, { status: 400 });
    }

    const { data, error } = await (supabase as any)
      .from("aktivitaeten_teilnahmen")
      .upsert({
        angebot_id,
        bewohner_id: bewohnerId,
        anbieter_id: anbieterId,
        datum,
        teilgenommen: teilgenommen ?? true,
        stimmung: stimmung || null,
        beobachtungen: beobachtungen || null,
        abgesagt: abgesagt ?? false,
        abgesagt_grund: abgesagt_grund || null,
        erstellt_von: user.id,
      }, { onConflict: "angebot_id,bewohner_id,datum" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ teilnahme: data }, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST /api/bewohner/[id]/aktivitaeten", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

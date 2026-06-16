import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

async function getAnbieter(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await (supabase as any).from("anbieter").select("id").eq("owner_id", userId).single();
  return (data as any)?.id ?? null;
}

// GET /api/therapie/[id]/einheiten
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: therapieId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Verify ownership
    const { data: therapie } = await (supabase as any)
      .from("therapien")
      .select("id, therapieart, bewohner_id")
      .eq("id", therapieId)
      .eq("anbieter_id", anbieterId)
      .single();
    if (!therapie) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: rawEinheiten, error } = await (supabase as any)
      .from("therapie_einheiten")
      .select("*")
      .eq("therapie_id", therapieId)
      .order("datum", { ascending: false });

    if (error) throw error;
    const einheiten = (rawEinheiten ?? []) as any[];

    const stats = {
      gesamt: einheiten.length,
      durchgefuehrt: einheiten.filter((e: any) => !e.abgesagt).length,
      abgesagt: einheiten.filter((e: any) => e.abgesagt).length,
      abgerechnet: einheiten.filter((e: any) => e.abgerechnet).length,
    };

    return NextResponse.json({ therapie, einheiten, stats });
  } catch (err) {
    logger.error("GET /api/therapie/[id]/einheiten", { error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/therapie/[id]/einheiten
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: therapieId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: therapie } = await (supabase as any)
      .from("therapien")
      .select("id, bewohner_id")
      .eq("id", therapieId)
      .eq("anbieter_id", anbieterId)
      .single();
    if (!therapie) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { datum, dauer_min, inhalt, verlauf, kooperation, zielfortschritt, abgesagt, abgesagt_grund, abgerechnet } = body;

    const { data: raw, error } = await (supabase as any)
      .from("therapie_einheiten")
      .insert({
        therapie_id: therapieId,
        bewohner_id: (therapie as any).bewohner_id,
        anbieter_id: anbieterId,
        datum: datum || new Date().toISOString().slice(0, 10),
        dauer_min: dauer_min ?? 45,
        inhalt: inhalt || null,
        verlauf: verlauf || "gut",
        kooperation: kooperation || null,
        zielfortschritt: zielfortschritt || null,
        abgesagt: abgesagt ?? false,
        abgesagt_grund: abgesagt_grund || null,
        abgerechnet: abgerechnet ?? false,
        erstellt_von: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ einheit: raw as any }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/therapie/[id]/einheiten", { error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

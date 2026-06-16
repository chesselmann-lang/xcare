import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

async function getAnbieter(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: prof } = await (supabase as any).from("profiles").select("id").eq("user_id", userId).single();
  const { data } = await (supabase as any).from("anbieter").select("id").eq("profile_id", prof?.id ?? "").single();
  return (data as any)?.id ?? null;
}

// GET /api/bewohner/[id]/therapie
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: bewohnerId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: rawTherapien, error } = await (supabase as any)
      .from("therapien")
      .select("*")
      .eq("bewohner_id", bewohnerId)
      .eq("anbieter_id", anbieterId)
      .order("erstellt_am", { ascending: false });

    if (error) throw error;
    const therapien = (rawTherapien ?? []) as any[];

    // Stats
    const stats = {
      gesamt: therapien.length,
      aktiv: therapien.filter((t: any) => t.status === "aktiv").length,
      pausiert: therapien.filter((t: any) => t.status === "pausiert").length,
      abgeschlossen: therapien.filter((t: any) => t.status === "abgeschlossen").length,
    };

    return NextResponse.json({ therapien, stats });
  } catch (err: unknown) {
    logger.error("GET /api/bewohner/[id]/therapie", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/bewohner/[id]/therapie
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: bewohnerId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { therapieart, therapeut_name, ziel, frequenz, beginn_datum, ende_datum, notizen } = body;

    if (!therapieart) return NextResponse.json({ error: "Therapieart ist Pflichtfeld" }, { status: 400 });

    const { data: raw, error } = await (supabase as any)
      .from("therapien")
      .insert({
        anbieter_id: anbieterId,
        bewohner_id: bewohnerId,
        therapieart,
        therapeut_name: therapeut_name || null,
        ziel: ziel || null,
        frequenz: frequenz || null,
        beginn_datum: beginn_datum || new Date().toISOString().slice(0, 10),
        ende_datum: ende_datum || null,
        notizen: notizen || null,
        erstellt_von: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ therapie: raw as any }, { status: 201 });
  } catch (err: unknown) {
    logger.error("POST /api/bewohner/[id]/therapie", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

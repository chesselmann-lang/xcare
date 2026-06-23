import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

async function getAnbieter(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: prof } = await (supabase as any).from("profiles").select("id").eq("user_id", userId).single();
  const { data } = await (supabase as any).from("anbieter").select("id").eq("profile_id", prof?.id ?? "").single();
  return data?.id ?? null;
}

// GET /api/aktivitaeten/[id] — Angebot + Teilnahmen
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [{ data: angebot }, { data: rawTeilnahmen }] = await Promise.all([
      (supabase as any).from("aktivitaeten_angebote").select("*").eq("id", id).eq("anbieter_id", anbieterId).single(),
      (supabase as any)
        .from("aktivitaeten_teilnahmen")
        .select("*, bewohner:bewohner(id, vorname, nachname)")
        .eq("angebot_id", id)
        .order("datum", { ascending: false })
        .limit(50),
    ]);

    if (!angebot) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ angebot, teilnahmen: rawTeilnahmen ?? [] });
  } catch (err) {
    logger.error("GET /api/aktivitaeten/[id]", { error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/aktivitaeten/[id] — aktiv toggle / Felder updaten
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Ung�ltige Anfrage' }, { status: 400 }) }
    const { data, error } = await (supabase as any)
      .from("aktivitaeten_angebote")
      .update(body)
      .eq("id", id)
      .eq("anbieter_id", anbieterId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ angebot: data });
  } catch (err) {
    logger.error("PATCH /api/aktivitaeten/[id]", { error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

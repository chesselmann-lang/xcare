import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

async function getAnbieter(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: prof } = await (supabase as any).from("profiles").select("id").eq("user_id", userId).single();
  const { data } = await (supabase as any).from("anbieter").select("id").eq("profile_id", prof?.id ?? "").single();
  return data?.id ?? null;
}

// GET /api/beschwerden/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [{ data: beschwerde }, { data: verlauf }] = await Promise.all([
      (supabase as any)
        .from("beschwerden")
        .select("*, bewohner:bewohner(vorname, nachname)")
        .eq("id", id)
        .eq("anbieter_id", anbieterId)
        .single(),
      (supabase as any)
        .from("beschwerde_verlauf")
        .select("*, profil:profiles(vorname, nachname)")
        .eq("beschwerde_id", id)
        .order("erstellt_am", { ascending: true }),
    ]);

    if (!beschwerde) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ beschwerde, verlauf: verlauf ?? [] });
  } catch (err) {
    logger.error("GET /api/beschwerden/[id]", { error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/beschwerden/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { status, massnahmen, ergebnis, interne_notizen, eskalationsstufe, frist, notiz } = body;

    const update: Record<string, unknown> = {};
    if (status) update.status = status;
    if (massnahmen !== undefined) update.massnahmen = massnahmen;
    if (ergebnis !== undefined) update.ergebnis = ergebnis;
    if (interne_notizen !== undefined) update.interne_notizen = interne_notizen;
    if (eskalationsstufe) update.eskalationsstufe = eskalationsstufe;
    if (frist) update.frist = frist;
    if (status === "abgeschlossen") update.abgeschlossen_am = new Date().toISOString();

    const { data, error } = await (supabase as any)
      .from("beschwerden")
      .update(update)
      .eq("id", id)
      .eq("anbieter_id", anbieterId)
      .select()
      .single();

    if (error) throw error;

    // Verlauf
    const aktionText = status
      ? `Status geändert: ${status}`
      : notiz
        ? "Notiz hinzugefügt"
        : "Beschwerde aktualisiert";

    await ((supabase as any).from("beschwerde_verlauf") as any).insert({
      beschwerde_id: id,
      aktion: aktionText,
      notiz: notiz || massnahmen || null,
      von_profil_id: user.id,
    });

    return NextResponse.json({ beschwerde: data });
  } catch (err) {
    logger.error("PATCH /api/beschwerden/[id]", { error: err });
    return NextResponse.json({ error: "Internal Server Error"  }, { status: 500 });
  }
}

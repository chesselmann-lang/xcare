import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

async function getAnbieter(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: prof } = await (supabase as any).from("profiles").select("id").eq("user_id", userId).single();
  const { data } = await (supabase as any).from("anbieter").select("id").eq("profile_id", prof?.id ?? "").single();
  return data?.id ?? null;
}

// GET /api/beschwerden?status=...&kategorie=...
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const kategorie = searchParams.get("kategorie");

    let query = (supabase as any)
      .from("beschwerden")
      .select(`
        id, kategorie, betreff, beschreibung, status, eskalationsstufe,
        frist, einreicher_name, einreicher_typ, erstellt_am, abgeschlossen_am,
        bewohner_id, bewohner:bewohner(vorname, nachname)
      `)
      .eq("anbieter_id", anbieterId)
      .order("erstellt_am", { ascending: false });

    if (status) query = query.eq("status", status);
    if (kategorie) query = query.eq("kategorie", kategorie);

    const { data: rawData, error } = await query;
    if (error) throw error;
    const data = (rawData ?? []) as any[];

    // Summary stats
    const stats = {
      gesamt: data.length,
      eingegangen: data.filter((b: any) => b.status === "eingegangen").length,
      in_bearbeitung: data.filter((b: any) => b.status === "in_bearbeitung").length,
      eskaliert: data.filter((b: any) => b.status === "eskaliert").length,
      abgeschlossen: data.filter((b: any) => b.status === "abgeschlossen").length,
      ueberfaellig: data.filter((b: any) => b.frist && new Date(b.frist) < new Date() && b.status !== "abgeschlossen").length,
    };

    return NextResponse.json({ beschwerden: data, stats });
  } catch (err) {
    logger.error("GET /api/beschwerden", { error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/beschwerden
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { kategorie, betreff, beschreibung, bewohner_id, einreicher_name,
            einreicher_typ, frist, vorfall_datum } = body;

    if (!betreff?.trim() || !beschreibung?.trim()) {
      return NextResponse.json({ error: "Betreff und Beschreibung sind Pflichtfelder" }, { status: 400 });
    }

    const { data: rawInsert, error } = await (supabase as any)
      .from("beschwerden")
      .insert({
        anbieter_id: anbieterId,
        bewohner_id: bewohner_id || null,
        einreicher_typ: einreicher_typ ?? "angehoerige",
        einreicher_name: einreicher_name || null,
        kategorie: kategorie ?? "sonstiges",
        betreff: betreff.trim(),
        beschreibung: beschreibung.trim(),
        frist: frist || null,
        vorfall_datum: vorfall_datum || null,
        status: "eingegangen",
      })
      .select()
      .single();
    const data = rawInsert as any;

    if (error) throw error;

    // Verlauf-Eintrag
    await ((supabase as any).from("beschwerde_verlauf") as any).insert({
      beschwerde_id: data.id,
      aktion: "Beschwerde eingegangen",
      von_profil_id: user.id,
    });

    return NextResponse.json({ beschwerde: data }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/beschwerden", { error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

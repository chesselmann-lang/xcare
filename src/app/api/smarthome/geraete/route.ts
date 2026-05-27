import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/smarthome/geraete — List user's connected devices
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data, error } = await supabase
      .from("smarthome_geraete")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ geraete: data ?? [] });
  } catch (e) {
    logger.error("GET /api/smarthome/geraete failed", { error: String(e) });
    return NextResponse.json({ error: "Fehler beim Laden der Geräte" }, { status: 500 });
  }
}

/**
 * POST /api/smarthome/geraete — Register a new device
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { name, typ, geraete_id, verbindungstyp, konfiguration } = await request.json();

    if (!name || !typ || !verbindungstyp) {
      return NextResponse.json({ error: "name, typ und verbindungstyp sind erforderlich" }, { status: 400 });
    }

    const { data: geraet, error } = await supabase
      .from("smarthome_geraete")
      .insert({
        user_id: user.id,
        name,
        typ,
        geraete_id: geraete_id || null,
        verbindungstyp,
        konfiguration: konfiguration ?? {},
        aktiv: true,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info("Smarthome Gerät registriert", { geraetId: geraet.id, userId: user.id });
    return NextResponse.json({ geraet }, { status: 201 });
  } catch (e) {
    logger.error("POST /api/smarthome/geraete failed", { error: String(e) });
    return NextResponse.json({ error: "Gerät konnte nicht gespeichert werden" }, { status: 500 });
  }
}

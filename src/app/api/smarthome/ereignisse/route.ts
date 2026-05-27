import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/smarthome/ereignisse — Last 24h events for current user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const seit24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("smarthome_ereignisse")
      .select("*, geraet:smarthome_geraete(name, typ)")
      .eq("user_id", user.id)
      .gte("created_at", seit24h)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ ereignisse: data ?? [] });
  } catch (e) {
    logger.error("GET /api/smarthome/ereignisse failed", { error: String(e) });
    return NextResponse.json({ error: "Fehler beim Laden der Ereignisse" }, { status: 500 });
  }
}

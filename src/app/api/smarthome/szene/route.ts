import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { activateBedtimeScene, triggerEmergencyFlash } from "@/lib/smarthome/hue";

/**
 * POST /api/smarthome/szene
 * Activate a Hue scene.
 * Body: { szene: "gute_nacht" | "notfall_licht" }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { szene } = await request.json();

    if (szene === "gute_nacht") {
      await activateBedtimeScene();
      logger.info("Gute-Nacht-Szene aktiviert", { userId: user.id });
      return NextResponse.json({ ok: true, szene });
    }

    if (szene === "notfall_licht") {
      await triggerEmergencyFlash();
      logger.info("Notfall-Licht-Test aktiviert", { userId: user.id });
      return NextResponse.json({ ok: true, szene });
    }

    return NextResponse.json({ error: "Unbekannte Szene" }, { status: 400 });
  } catch (e) {
    logger.error("POST /api/smarthome/szene failed", { error: String(e) });
    return NextResponse.json({ error: "Szene konnte nicht aktiviert werden" }, { status: 500 });
  }
}

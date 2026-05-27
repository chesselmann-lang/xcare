import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { sendSms, SMS_TEMPLATES } from "@/lib/twilio";
import { triggerEmergencyFlash } from "@/lib/smarthome/hue";

// Event type → severity mapping
const SCHWEREGRAD_MAP: Record<string, "info" | "warnung" | "kritisch"> = {
  bewegung: "info",
  tuer_offen: "info",
  tuer_geschlossen: "info",
  bett_betreten: "info",
  bett_verlassen: "warnung",
  inaktivitaet: "warnung",
  sturz_erkannt: "kritisch",
  notfall: "kritisch",
};

/**
 * POST /api/smarthome/webhook
 * Incoming webhook from MQTT bridge or Hue bridge.
 * Body: { type, deviceId, data, userId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, deviceId, data, userId } = body;

    if (!type || !userId) {
      return NextResponse.json({ error: "type und userId sind erforderlich" }, { status: 400 });
    }

    const schweregrad = SCHWEREGRAD_MAP[type] ?? "info";

    const supabase = await createAdminClient();

    // Look up device if deviceId provided
    let geraetId: string | null = null;
    if (deviceId) {
      const { data: geraet } = await supabase
        .from("smarthome_geraete")
        .select("id")
        .eq("user_id", userId)
        .eq("geraete_id", deviceId)
        .single();
      geraetId = geraet?.id ?? null;

      // Update last contact
      if (geraetId) {
        await supabase
          .from("smarthome_geraete")
          .update({ letzter_kontakt: new Date().toISOString(), letzter_wert: data ?? {} })
          .eq("id", geraetId);
      }
    }

    // Save event
    const { data: ereignis, error: ereignisError } = await supabase
      .from("smarthome_ereignisse")
      .insert({
        user_id: userId,
        geraet_id: geraetId,
        typ: type,
        schweregrad,
        daten: data ?? {},
        verarbeitet: false,
      })
      .select()
      .single();

    if (ereignisError) throw ereignisError;

    // Critical events: create Frühwarnung + SMS
    if (schweregrad === "kritisch") {
      // Trigger emergency light flash (fire-and-forget)
      triggerEmergencyFlash().catch(err =>
        logger.warn("Hue emergency flash failed", { error: String(err) })
      );

      // Fetch user's emergency contacts
      const { data: kontakte } = await supabase
        .from("notfallkontakte")
        .select("telefon_1, name")
        .eq("user_id", userId)
        .order("prioritaet", { ascending: true })
        .limit(2);

      // Send SMS to top contacts
      const situation =
        type === "sturz_erkannt"
          ? "Sturz wurde erkannt"
          : type === "notfall"
          ? "Notfallknopf wurde gedrückt"
          : `Kritisches Ereignis: ${type}`;

      if (kontakte?.length) {
        await Promise.all(
          kontakte.map(k =>
            sendSms({
              to: k.telefon_1,
              message: SMS_TEMPLATES.notfallAlert(k.name, situation),
            })
          )
        );
      }

      // Create Frühwarnung entry
      await supabase.from("fruehwarnungen").insert({
        user_id: userId,
        typ: "smarthome",
        schweregrad: "kritisch",
        beschreibung: situation,
        referenz_id: ereignis.id,
        referenz_typ: "smarthome_ereignis",
      }).catch(err =>
        logger.warn("Frühwarnung insert failed (table may not exist)", { error: String(err) })
      );

      logger.warn("Kritisches Smarthome-Ereignis verarbeitet", {
        userId,
        type,
        ereignisId: ereignis.id,
      });
    }

    // Mark event as processed
    await supabase
      .from("smarthome_ereignisse")
      .update({ verarbeitet: true })
      .eq("id", ereignis.id);

    return NextResponse.json({ ok: true, ereignisId: ereignis.id });
  } catch (e) {
    logger.error("POST /api/smarthome/webhook failed", { error: String(e) });
    return NextResponse.json({ error: "Webhook-Verarbeitung fehlgeschlagen" }, { status: 500 });
  }
}

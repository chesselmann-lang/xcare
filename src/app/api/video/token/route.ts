import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// POST: Generate a Daily.co meeting token for the authenticated user
export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 20, window: 60 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await req.json();
    const { roomName } = body;

    if (!roomName || typeof roomName !== "string") {
      return NextResponse.json({ error: "roomName fehlt" }, { status: 400 });
    }

    const dailyApiKey = process.env.DAILY_API_KEY;
    if (!dailyApiKey) {
      return NextResponse.json({ error: "Daily.co nicht konfiguriert" }, { status: 503 });
    }

    // Verify the user is a participant or host of this room
    const { data: termin } = await supabase
      .from("video_termine")
      .select("gastgeber_id, teilnehmer_ids")
      .eq("daily_room_name", roomName)
      .maybeSingle();

    if (
      termin &&
      termin.gastgeber_id !== user.id &&
      !(termin.teilnehmer_ids as string[]).includes(user.id)
    ) {
      return NextResponse.json({ error: "Kein Zugriff auf diesen Raum" }, { status: 403 });
    }

    const exp = Math.floor(Date.now() / 1000) + 3600;
    const isOwner = termin?.gastgeber_id === user.id;

    const tokenRes = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dailyApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          is_owner: isOwner,
          user_id: user.id,
          exp,
        },
      }),
    });

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.text();
      logger.error("Daily.co token generation failed", { error: tokenErr });
      return NextResponse.json({ error: "Token konnte nicht generiert werden" }, { status: 502 });
    }

    const tokenData = await tokenRes.json();

    return NextResponse.json({ token: tokenData.token });
  } catch (error) {
    logger.error("POST /api/video/token unhandled error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}

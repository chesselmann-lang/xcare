import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// POST: Create a Daily.co room and save the video_termin record
export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 10, window: 300 });
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
    const { geplant_fuer, dauer_minuten = 30, typ = "beratung", betreff, agenda } = body;

    if (!geplant_fuer) {
      return NextResponse.json({ error: "geplant_fuer fehlt" }, { status: 400 });
    }

    const dailyApiKey = process.env.DAILY_API_KEY;
    if (!dailyApiKey) {
      return NextResponse.json({ error: "Daily.co nicht konfiguriert" }, { status: 503 });
    }

    // Create Daily.co room
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const roomRes = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dailyApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          privacy: "private",
          exp,
          max_participants: 10,
          enable_chat: true,
          geo: "eu",
        },
      }),
    });

    if (!roomRes.ok) {
      const roomErr = await roomRes.text();
      logger.error("Daily.co room creation failed", { error: roomErr });
      return NextResponse.json({ error: "Raum konnte nicht erstellt werden" }, { status: 502 });
    }

    const room = await roomRes.json();
    const roomName: string = room.name;
    const roomUrl: string = room.url;

    // Generate a meeting token for the host
    const tokenRes = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dailyApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          is_owner: true,
          user_id: user.id,
          exp,
        },
      }),
    });

    let token: string | null = null;
    if (tokenRes.ok) {
      const tokenData = await tokenRes.json();
      token = tokenData.token ?? null;
    }

    // Save video_termin to Supabase
    const { data: termin, error: insertErr } = await supabase
      .from("video_termine")
      .insert({
        gastgeber_id: user.id,
        geplant_fuer,
        dauer_minuten,
        typ,
        betreff: betreff?.trim() ?? null,
        agenda: agenda?.trim() ?? null,
        daily_room_name: roomName,
        daily_room_url: roomUrl,
        status: "geplant",
      })
      .select()
      .single();

    if (insertErr) {
      logger.error("video_termine insert error", { error: insertErr.message });
      return NextResponse.json({ error: "Termin konnte nicht gespeichert werden" }, { status: 500 });
    }

    return NextResponse.json({ roomUrl, roomName, token, termin }, { status: 201 });
  } catch (error) {
    logger.error("POST /api/video/rooms unhandled error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}

// GET: List the authenticated user's upcoming video_termine
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("video_termine")
      .select("*")
      .or(`gastgeber_id.eq.${user.id},teilnehmer_ids.cs.{${user.id}}`)
      .gte("geplant_fuer", new Date().toISOString())
      .order("geplant_fuer", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ termine: data });
  } catch (error) {
    logger.error("GET /api/video/rooms unhandled error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}

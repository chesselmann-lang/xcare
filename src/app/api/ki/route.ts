import { NextRequest, NextResponse } from "next/server";
import { streamLotseAntwort } from "@/lib/ai/lotse";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { isLebenslage, maxLen, isPlz } from "@/lib/validate";
import type { LebenslageTyp, WizardAntwort } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Rate limit: 15 requests per minute per IP (KI-Lotse is expensive)
  const rl = await rateLimit(req, { limit: 15, window: 60 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    const body = await req.json();
    const {
      lebenslage,
      antworten,
      frage,
      plz,
    }: {
      lebenslage: LebenslageTyp;
      antworten: WizardAntwort[];
      frage: string;
      plz: string;
    } = body;

    if (!isLebenslage(lebenslage))
      return NextResponse.json({ error: "Ungültige Lebenslage" }, { status: 400 });
    if (!maxLen(frage, 500))
      return NextResponse.json({ error: "Frage fehlt oder zu lang (max. 500 Zeichen)" }, { status: 400 });
    // plz is optional but must be valid when provided
    const safePlz = isPlz(plz) ? plz : "";

    // Anzahl passender Anbieter ermitteln (für Kontext)
    const supabase = await createClient();
    const { count } = await supabase
      .from("anbieter")
      .select("*", { count: "exact", head: true })
      .eq("aktiv", true)
      .ilike("plz", (safePlz ? safePlz.substring(0, 2) : "") + "%");

    const stream = streamLotseAntwort(
      lebenslage as LebenslageTyp,
      antworten ?? [],
      frage,
      count ?? 0
    );

    // Streaming Response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(encoder.encode(chunk));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logger.error("KI-Lotse error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Interner Fehler" },
      { status: 500 }
    );
  }
}

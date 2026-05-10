import { NextRequest, NextResponse } from "next/server";
import { streamLotseAntwort } from "@/lib/ai/lotse";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
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

    if (!lebenslage || !frage) {
      return NextResponse.json(
        { error: "lebenslage und frage sind pflicht" },
        { status: 400 }
      );
    }

    // Anzahl passender Anbieter ermitteln (für Kontext)
    const supabase = await createClient();
    const { count } = await supabase
      .from("anbieter")
      .select("*", { count: "exact", head: true })
      .eq("aktiv", true)
      .eq("plz", plz.substring(0, 2) + "%"); // vereinfacht

    const stream = streamLotseAntwort(
      lebenslage,
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
    console.error("[KI-Lotse]", error);
    return NextResponse.json(
      { error: "Interner Fehler" },
      { status: 500 }
    );
  }
}

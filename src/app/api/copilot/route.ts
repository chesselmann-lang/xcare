// ============================================
// API: /api/copilot
// POST — KI-Co-Pilot mit Tool-Use, SSE Streaming
// Rate Limit: 20 req/min
// ============================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { streamCopilotAntwort } from "@/lib/ai/copilot";
import { createClient } from "@/lib/supabase/server";

const CopilotInputSchema = z.object({
  frage: z.string().min(1).max(2000),
  kontext: z
    .object({
      lebenslage: z.string().optional(),
      pflegegrad: z.number().min(1).max(5).optional(),
      plz: z.string().max(5).optional(),
    })
    .optional()
    .default({}),
  verlauf: z
    .array(
      z.object({
        rolle: z.enum(["user", "assistant"]),
        inhalt: z.string().max(4000),
      })
    )
    .max(20)
    .optional()
    .default([]),
});

export async function POST(request: NextRequest) {
  // Rate-Limit: 20 Anfragen/Minute pro IP
  const rl = await rateLimit(request, { limit: 20, window: 60 });
  if (!rl.success) {
    return new Response(
      JSON.stringify({ error: "Zu viele Anfragen. Bitte warten Sie einen Moment." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // Auth (optional — erlaubt auch nicht-angemeldete Nutzer mit strengerem Limit)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Nicht-angemeldete Nutzer: strengeres Limit
  if (!user) {
    const anonRl = await rateLimit(request, { limit: 5, window: 60, key: `copilot:anon:${request.headers.get("x-forwarded-for") ?? "anon"}` });
    if (!anonRl.success) {
      return new Response(
        JSON.stringify({ error: "Bitte melden Sie sich an, um den Co-Pilot unbegrenzt zu nutzen." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Ungültiges JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = CopilotInputSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Ungültige Eingabe", details: parsed.error.flatten() }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }

  const { frage, kontext, verlauf } = parsed.data;

  // SSE Stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamCopilotAntwort(frage, kontext, verlauf)) {
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      } catch (err) {
        const errData = `data: ${JSON.stringify({ type: "error", message: "Interner Fehler" })}\n\n`;
        controller.enqueue(encoder.encode(errData));
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

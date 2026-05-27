import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `Du bist ein erfahrener Pflegegutachter und kennst das deutsche Begutachtungssystem (NBI/NBA) sehr gut. Du hilfst Familien dabei, den wahrscheinlichen Pflegegrad einer pflegebedürftigen Person einzuschätzen. Antworte stets auf Deutsch, einfühlsam und klar verständlich.

Das NBI bewertet 6 Module mit gewichteten Punkten (Gesamtskala 0–100):
- Modul 1 – Mobilität (Gewicht 10 %): Positionswechsel im Bett, stabile Sitzposition halten, Umsetzen, Fortbewegung innen, Treppensteigen
- Modul 2 – Kognition & Kommunikation (Gewicht 15 %): Personen erkennen, örtliche/zeitliche Orientierung, Alltagsgegenstände erkennen, Risiken erkennen
- Modul 3 – Verhaltensweisen & psych. Problemlagen (Gewicht 15 %): motorische Unruhe, nächtliche Unruhe, Abwehrverhalten
- Modul 4 – Selbstversorgung (Gewicht 40 %): Waschen, Körperpflege, An-/Auskleiden, Essen, Trinken, Toilette
- Modul 5 – Krankheitsbedingte Anforderungen (Gewicht 20 %): Medikamente, Arztbesuche, Hilfsmittel
- Modul 6 – Alltagsleben & soziale Kontakte (Gewicht 0 % — aber für PG 5 relevant): Tagesstruktur, Freizeitgestaltung, Kontakte

Bewertungsskala pro Item: 0 = selbstständig, 1 = überwiegend selbstständig, 2 = überwiegend unselbstständig, 3 = unselbstständig.

Pflegegrade (Gesamtpunkte):
- Pflegegrad 1: 12,5–<27 Punkte
- Pflegegrad 2: 27–<47,5 Punkte
- Pflegegrad 3: 47,5–<70 Punkte
- Pflegegrad 4: 70–<90 Punkte
- Pflegegrad 5: 90–100 Punkte

WICHTIG: Dies ist eine unverbindliche Einschätzungshilfe, kein amtliches Gutachten. Weise am Ende darauf hin, dass der MDK/MEDICPROOF die verbindliche Begutachtung durchführt. Gib keine medizinischen Diagnosen.

Wenn du den finalen Pflegegrad einschätzt, gib deine Antwort in folgendem JSON-Format aus (in einem \`\`\`json Block):
{
  "pflegegrad": <1-5>,
  "nbiPunkte": <0-100>,
  "begruendung": "...",
  "empfehlungen": ["...", "..."],
  "warnhinweise": ["...", "..."]
}`;

// POST: streaming commentary after each step
export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 20, window: 60 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const body = await req.json();
    const {
      sessionId,
      messages,
      antworten,
    }: {
      sessionId?: string;
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      antworten?: Record<string, number>;
    } = body;

    // Persist current answers
    if (sessionId && antworten) {
      await supabase
        .from("pflegegrad_coach_sessions")
        .update({ antworten })
        .eq("id", sessionId);
    }

    const stream = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`
                )
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logger.error("Pflegegrad-Coach POST failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "KI-Fehler" }, { status: 500 });
  }
}

// PUT: save completed assessment result
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const body = await req.json();
    const {
      sessionId,
      ergebnis,
    }: {
      sessionId: string;
      ergebnis: {
        pflegegrad: number;
        nbiPunkte: number;
        begruendung: string;
        empfehlungen: string[];
        warnhinweise: string[];
      };
    } = body;

    const { data, error } = await supabase
      .from("pflegegrad_coach_sessions")
      .update({
        status: "completed",
        geschaetzter_pflegegrad: ergebnis.pflegegrad,
        ki_begruendung: ergebnis.begruendung,
        ki_empfehlungen: ergebnis.empfehlungen,
        ki_warnhinweise: ergebnis.warnhinweise,
        nbi_gesamt_punkte: ergebnis.nbiPunkte,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Pflegegrad-Coach PUT failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Speicherfehler" }, { status: 500 });
  }
}

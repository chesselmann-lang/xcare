import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { LEBENSLAGEN } from "@/lib/constants";
import type { LebenslageTyp } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 5, window: 60 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    const body = await req.json();
    const lebenslage = body.lebenslage as LebenslageTyp | undefined;
    const anamnese = String(body.anamnese ?? "").trim().slice(0, 2000);
    const alter = body.alter ? Number(body.alter) : null;
    const pflegegrad = body.pflegegrad ? String(body.pflegegrad) : null;
    const ziele = String(body.ziele ?? "").trim().slice(0, 500);

    if (!lebenslage || !anamnese) {
      return NextResponse.json(
        { error: "Lebenslage und Anamnese sind erforderlich" },
        { status: 400 }
      );
    }

    const lebenslageMeta = LEBENSLAGEN[lebenslage];
    const lebenslageName = lebenslageMeta?.label ?? lebenslage;

    const systemPrompt = `Du bist ein erfahrener Pflegeberater und Sozialrechtler in Deutschland.
Du erstellst individuelle, strukturierte Pflegepläne auf Basis der Lebenslage, Anamnese und Ziele der Familie.
Antworte ausschließlich als valides JSON-Objekt. Keine Erklärungen außerhalb des JSON.
Das JSON muss folgendes Schema einhalten:
{
  "zusammenfassung": "string (2-3 Sätze, verständlich)",
  "massnahmen": [
    {
      "titel": "string",
      "beschreibung": "string",
      "prioritaet": "hoch" | "mittel" | "niedrig",
      "zeitrahmen": "string (z.B. 'sofort', 'innerhalb 4 Wochen', 'langfristig')",
      "kategorie": "string (z.B. 'Pflege', 'Beratung', 'Finanzierung', 'Therapie')"
    }
  ],
  "ansprueche": ["string (SGB-Paragraph + kurze Erklärung)"],
  "naechsteSchritte": ["string (konkreter Schritt)"],
  "anbieterTypen": ["string (z.B. 'Ambulanter Pflegedienst', 'Tagespflege')"],
  "hinweis": "string (wichtiger rechtlicher oder medizinischer Hinweis, optional)"
}
Erstelle 3-6 Maßnahmen, 2-4 Ansprüche, 3-5 nächste Schritte, 2-4 Anbietertypen.
Sei präzise, praxisnah und empathisch. Nutze die relevanten SGB-Paragraphen.`;

    const userPrompt = `Erstelle einen individuellen Pflegeplan für folgende Situation:

**Lebenslage:** ${lebenslageName}
${alter ? `**Alter der pflegebedürftigen Person:** ${alter} Jahre` : ""}
${pflegegrad ? `**Pflegegrad:** ${pflegegrad}` : ""}
**Anamnese / Situation:**
${anamnese}
${ziele ? `**Persönliche Ziele / Wünsche:**\n${ziele}` : ""}

Erstelle einen maßgeschneiderten Pflegeplan als JSON.`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from response (may have markdown fences)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error("PflegeplanGenerator: no JSON in response", { rawText });
      return NextResponse.json(
        { error: "KI-Antwort konnte nicht verarbeitet werden" },
        { status: 500 }
      );
    }

    const plan = JSON.parse(jsonMatch[0]);

    logger.info("PflegeplanGenerator: plan generated", {
      userId: user.id,
      lebenslage,
    });

    return NextResponse.json({ plan });
  } catch (err) {
    logger.error("POST /api/pflegeplan/generieren failed", {
      error: String(err),
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

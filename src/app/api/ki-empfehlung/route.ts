import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  // Rate limit: 20 requests per minute per IP (authenticated endpoint but still guards AI cost)
  const rl = await rateLimit(req, { limit: 20, window: 60 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    // Auth: only for logged-in families
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { lebenslage, plz, ort, offeneAnfragen, empfohleneAnbieterNamen } = await req.json();

    const lebenslagenLabel: Record<string, string> = {
      geburt_fruehe_kindheit: "Geburt & frühe Kindheit",
      schulkind_jugend: "Schulkind & Jugend",
      eingliederung_behinderung: "Behinderung & Eingliederung",
      erwerbsleben_vereinbarkeit: "Erwerbsleben & Vereinbarkeit",
      krankheit_genesung: "Krankheit & Genesung",
      alter_pflege: "Alter & Pflege",
      hospiz_palliativ: "Hospiz & Palliativ",
      trauer_nachlass: "Trauer & Nachlass",
    };

    const situationLabel = lebenslage ? lebenslagenLabel[lebenslage] : null;
    const anbieterText = empfohleneAnbieterNamen?.length
      ? `In Ihrer Region (${ort ?? plz ?? "Ihrer Region"}) haben wir folgende Anbieter gefunden: ${empfohleneAnbieterNamen.join(", ")}.`
      : `Wir suchen gerade passende Anbieter in Ihrer Region (${ort ?? plz ?? "Ihrer Nähe"}).`;

    const prompt = situationLabel
      ? `Du bist ein einfühlsamer Pflegeberater auf einem deutschen Pflege-Portal namens xcare. Eine Familie befindet sich in der Lebenslage "${situationLabel}" und hat ${offeneAnfragen ?? 0} offene Anfrage(n). ${anbieterText}

Schreibe GENAU 2 kurze Sätze: einen warmen, persönlichen Satz der die Situation anerkennt, und einen praktischen Tipp was die Familie als nächstes tun könnte. Keine Überschrift, keine Aufzählung, keine Emojis. Spreche die Familie mit "Sie" an.`
      : `Du bist ein einfühlsamer Pflegeberater auf einem deutschen Pflege-Portal namens xcare. Eine Familie sucht Unterstützung und hat ${offeneAnfragen ?? 0} offene Anfrage(n). ${anbieterText}

Schreibe GENAU 2 kurze Sätze: einen warmen Willkommenssatz und einen praktischen Tipp zum nächsten Schritt. Keine Überschrift, keine Aufzählung, keine Emojis. Spreche die Familie mit "Sie" an.`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (message.content[0] as { type: string; text: string })?.text?.trim() ?? "";

    return NextResponse.json({ text });
  } catch (err) {
    console.error("[ki-empfehlung]", err);
    return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
  }
}

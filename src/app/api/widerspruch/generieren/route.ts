// ============================================================
// API: POST /api/widerspruch/generieren
// Generiert einen rechtlich korrekten MDK-Widerspruchsbrief
// via Claude (claude-sonnet-4-6) und speichert in Supabase
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic();

// ─── Validation ──────────────────────────────────────────────────────────────

const InputSchema = z.object({
  widerspruchId: z.string().uuid().optional(),
  bescheidDatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pflegekasse: z.string().min(2).max(200),
  ablehnungGrund: z.string().min(10).max(3000),
  eigenArgumente: z.string().max(3000).default(""),
  pflegegrad: z.number().int().min(1).max(5).optional(),
  bezugTyp: z
    .enum(["pflegegrad", "leistung", "antrag", "bescheid"])
    .default("pflegegrad"),
  aktenzeichen: z.string().max(100).optional(),
});

// ─── System Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Du bist ein spezialisierter Rechtsanwalt für Pflegeversicherungsrecht in Deutschland. Du generierst rechtlich korrekte Widerspruchsbriefe nach SGB XI § 78 ff. und SGG § 84.

Beachte folgende rechtliche Grundlagen:
- Widerspruchsfrist: 1 Monat ab Zustellung des Bescheids (§ 84 SGG)
- Zuständig: Widerspruchsausschuss der Pflegekasse
- Anspruchsgrundlagen SGB XI: § 14 (Pflegebedürftigkeit), § 15 (Pflegegrade), § 18 (Begutachtung), § 36-45 (Leistungen)
- Bei Pflegegradentscheidungen: Begutachtungsrichtlinien des MDS (Medizinischer Dienst)
- Formale Anforderungen: schriftlich, begründet, an die Pflegekasse adressiert

Dein Brief soll:
1. Formal korrekt sein (Betreff, Datum, Aktenzeichen, Anrede)
2. Den Widerspruch klar und unmissverständlich anmelden
3. Rechtliche Grundlagen nennen (konkrete Paragrafen)
4. Die Argumentation sachlich und überzeugend darlegen
5. Beweise/Unterlagen einfordern oder ankündigen
6. Eine klare Forderung formulieren
7. Mit einer professionellen Grußformel enden

Schreibe ausschließlich auf Deutsch. Verwende förmliche Sprache (Sie-Anrede). Füge keine Platzhalter wie [NAME] ein — das Datum und Adressdaten werden durch das System eingefügt. Schreibe den Brief beginnend mit "Betreff:" direkt.`;

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Rate Limit: 5 KI-Generierungen pro Minute (kostspielig)
  const rl = await rateLimit(req, { limit: 5, window: 60 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  // ─── Parse + Validate ────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const {
    widerspruchId,
    bescheidDatum,
    pflegekasse,
    ablehnungGrund,
    eigenArgumente,
    pflegegrad,
    bezugTyp,
    aktenzeichen,
  } = parsed.data;

  // ─── Frist berechnen (1 Monat ab Bescheid) ──────────────────────────────
  const bescheidDate = new Date(bescheidDatum);
  const fristDate = new Date(bescheidDate);
  fristDate.setMonth(fristDate.getMonth() + 1);
  const fristDatum = fristDate.toISOString().substring(0, 10);

  // ─── KI-Generierung ──────────────────────────────────────────────────────
  const pflegegradHinweis = pflegegrad
    ? `Der beantragte Pflegegrad ist ${pflegegrad}.`
    : "";

  const userPrompt = `Erstelle einen vollständigen Widerspruchsbrief mit folgenden Angaben:

Pflegekasse: ${pflegekasse}
Datum des Bescheids: ${new Date(bescheidDatum).toLocaleDateString("de-DE")}
${aktenzeichen ? `Aktenzeichen: ${aktenzeichen}` : ""}
Bezug: ${bezugTyp === "pflegegrad" ? "Einstufung in einen Pflegegrad" : bezugTyp === "leistung" ? "Leistungsbescheid" : bezugTyp === "antrag" ? "Antragsbescheid" : "Bescheid"}
${pflegegradHinweis}
Widerspruchsfrist: ${new Date(fristDatum).toLocaleDateString("de-DE")}

Begründung der Pflegekasse für die Ablehnung:
${ablehnungGrund}

Eigene Argumente der pflegebedürftigen Person / ihrer Angehörigen:
${eigenArgumente || "Keine zusätzlichen Argumente angegeben."}

Schreibe jetzt den vollständigen, formellen Widerspruchsbrief.`;

  let generatedText = "";
  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const message = await stream.finalMessage();
    generatedText =
      message.content[0].type === "text" ? message.content[0].text : "";
  } catch (err) {
    logger.error("Widerspruch KI-Generierung fehlgeschlagen", {
      userId: user.id,
      error: String(err),
    });
    return NextResponse.json(
      { error: "KI-Generierung fehlgeschlagen. Bitte versuchen Sie es erneut." },
      { status: 502 }
    );
  }

  // ─── In Supabase speichern ───────────────────────────────────────────────
  let savedId = widerspruchId;

  if (widerspruchId) {
    // Bestehenden Datensatz aktualisieren
    const { error } = await supabase
      .from("widersprueche")
      .update({
        ki_generierter_text: generatedText,
        status: "generiert",
        frist_datum: fristDatum,
        pflegekasse_name: pflegekasse,
        bescheid_datum: bescheidDatum,
        bescheid_aktenzeichen: aktenzeichen ?? null,
        ablehnung_grund: ablehnungGrund,
        eigene_argumentation: eigenArgumente || null,
      })
      .eq("id", widerspruchId)
      .eq("user_id", user.id);

    if (error) {
      logger.error("Widerspruch update error", { error: error.message });
    }
  } else {
    // Neuen Datensatz anlegen
    const { data: neu, error } = await supabase
      .from("widersprueche")
      .insert({
        user_id: user.id,
        bezug_typ: bezugTyp,
        bescheid_datum: bescheidDatum,
        bescheid_aktenzeichen: aktenzeichen ?? null,
        pflegekasse_name: pflegekasse,
        ablehnung_grund: ablehnungGrund,
        eigene_argumentation: eigenArgumente || null,
        ki_generierter_text: generatedText,
        status: "generiert",
        frist_datum: fristDatum,
      })
      .select("id")
      .single();

    if (error) {
      logger.error("Widerspruch insert error", { error: error.message });
    } else {
      savedId = neu.id;
    }
  }

  return NextResponse.json({
    success: true,
    id: savedId,
    generatedText,
    fristDatum,
  });
}

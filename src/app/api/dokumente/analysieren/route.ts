import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const ANALYSE_SYSTEM_PROMPT = `Du bist ein Experte für deutsche Pflegeversicherung und MDK-Gutachten.
Analysiere das folgende Dokument und extrahiere alle relevanten Informationen präzise und strukturiert.

Antworte ausschließlich mit einem gültigen JSON-Objekt ohne Markdown-Code-Blöcke. Struktur:
{
  "dokument_typ": "mdk_bescheid" | "pflegegutachten" | "ablehnungsbescheid" | "widerspruchsbescheid" | "kassenschreiben" | "arztbrief" | "sonstiges",
  "pflegegrad": <Zahl 1-5 oder null>,
  "datum": "<ISO-Datum oder null>",
  "aktenzeichen": "<Aktenzeichen oder null>",
  "absender": "<Name der Kasse/Behörde oder null>",
  "begruendung": "<Hauptbegründung in 2-3 Sätzen>",
  "zusammenfassung": "<Kurze Zusammenfassung des Dokuments in 3-5 Sätzen>",
  "widerspruchsmoeglich": <true|false>,
  "widerspruchsfrist_tage": <Zahl oder null>,
  "widerspruch_begruendung": "<Mögliche Widerspruchsargumente, wenn relevant, sonst null>",
  "handlungsempfehlung": "<Konkrete nächste Schritte für die betroffene Person>"
}`;

async function analysiereWithClaude(
  base64Data: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf"
): Promise<Record<string, unknown>> {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const isPdf = mediaType === "application/pdf";

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: ANALYSE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          isPdf
            ? {
                type: "document" as const,
                source: {
                  type: "base64" as const,
                  media_type: mediaType,
                  data: base64Data,
                },
              }
            : {
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                  data: base64Data,
                },
              },
          {
            type: "text",
            content: "Analysiere dieses Dokument vollständig und antworte ausschließlich mit dem JSON-Objekt.",
          } as { type: "text"; content: string },
        ],
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";

  // Strip markdown code blocks if present
  const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
  return JSON.parse(cleaned);
}

/**
 * POST /api/dokumente/analysieren
 * Accepts multipart/form-data with a file field "file"
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 400 });
    }

    // Validate file type
    const erlaubteTypen = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/heic",
      "image/webp",
    ];
    if (!erlaubteTypen.includes(file.type) && !file.name.toLowerCase().endsWith(".heic")) {
      return NextResponse.json(
        { error: "Nicht unterstützter Dateityp. Erlaubt: PDF, JPG, PNG, HEIC" },
        { status: 400 }
      );
    }

    // Max 5MB for vision analysis
    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Datei zu groß. Maximum: 5 MB" },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage (service role for reliability)
    const adminClient = await createAdminClient();
    const storagePath = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await adminClient.storage
      .from("dokumente")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      logger.error("Storage upload failed", { error: String(uploadError) });
      return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 });
    }

    // Create DB record with status='ausstehend'
    const { data: analyse, error: dbError } = await adminClient
      .from("dokument_analysen")
      .insert({
        user_id: user.id,
        dateiname: file.name,
        storage_path: storagePath,
        dateityp: file.type,
        status: "ausstehend",
      })
      .select()
      .single();

    if (dbError || !analyse) {
      logger.error("dokument_analysen insert failed", { error: String(dbError) });
      return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
    }

    // Mark as processing
    await adminClient
      .from("dokument_analysen")
      .update({ status: "verarbeitung" })
      .eq("id", analyse.id);

    // Run Claude Vision analysis
    let ergebnisse: Record<string, unknown> = {};
    try {
      const base64 = Buffer.from(buffer).toString("base64");

      // Normalize media type for Claude
      let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf" =
        "image/jpeg";
      if (file.type === "application/pdf") mediaType = "application/pdf";
      else if (file.type === "image/png") mediaType = "image/png";
      else if (file.type === "image/webp") mediaType = "image/webp";
      // HEIC not natively supported — treat as jpeg (conversion may be needed in production)

      ergebnisse = await analysiereWithClaude(base64, mediaType);

      // Save analysis results
      await adminClient
        .from("dokument_analysen")
        .update({
          status: "fertig",
          dokument_typ: (ergebnisse.dokument_typ as string) ?? null,
          ki_zusammenfassung: (ergebnisse.zusammenfassung as string) ?? null,
          ki_extrahierte_daten: {
            pflegegrad: ergebnisse.pflegegrad,
            datum: ergebnisse.datum,
            aktenzeichen: ergebnisse.aktenzeichen,
            absender: ergebnisse.absender,
            begruendung: ergebnisse.begruendung,
            widerspruchsmoeglich: ergebnisse.widerspruchsmoeglich,
            widerspruchsfrist_tage: ergebnisse.widerspruchsfrist_tage,
          },
          ki_handlungsempfehlung: (ergebnisse.handlungsempfehlung as string) ?? null,
          ki_widerspruch_begruendung: (ergebnisse.widerspruch_begruendung as string) ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", analyse.id);

      logger.info("Dokument analysiert", { analyseId: analyse.id, userId: user.id });
    } catch (kiError) {
      logger.error("Claude analysis failed", { error: String(kiError), analyseId: analyse.id });
      await adminClient
        .from("dokument_analysen")
        .update({
          status: "fehler",
          fehler_nachricht: String(kiError),
          updated_at: new Date().toISOString(),
        })
        .eq("id", analyse.id);
    }

    return NextResponse.json({ analyseId: analyse.id, ergebnisse }, { status: 201 });
  } catch (e) {
    logger.error("POST /api/dokumente/analysieren failed", { error: String(e) });
    return NextResponse.json({ error: "Analyse fehlgeschlagen" }, { status: 500 });
  }
}

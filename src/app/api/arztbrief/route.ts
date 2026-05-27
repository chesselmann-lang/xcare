import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const maxDuration = 60;

const ArztbriefSchema = z.object({
  patientInfo: z.object({
    vorname: z.string().max(100),
    nachname: z.string().max(100),
    geburtsdatum: z.string().optional(),
    pflegegrad: z.number().min(1).max(5).optional(),
  }),
  diagnosen: z.array(z.string().max(200)).max(20).default([]),
  medikamente: z.array(z.string().max(300)).max(30).default([]),
  aktuelleSymptome: z.string().max(2000),
  pflegegrad: z.number().min(1).max(5).optional(),
  anlass: z.enum(["erstvorstellung", "kontrolltermin", "notfall", "ueberweisung"]),
});

const ANLASS_LABELS: Record<string, string> = {
  erstvorstellung: "Erstvorstellung",
  kontrolltermin: "Kontrolltermin",
  notfall: "Notfall",
  ueberweisung: "Überweisung",
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const body = await req.json();
    const parsed = ArztbriefSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Eingabe", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { patientInfo, diagnosen, medikamente, aktuelleSymptome, anlass } =
      parsed.data;

    const today = new Date().toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const pflegegradText = patientInfo.pflegegrad
      ? `Pflegegrad ${patientInfo.pflegegrad}`
      : "Pflegegrad nicht angegeben";

    const geburtsText = patientInfo.geburtsdatum
      ? `geb. ${new Date(patientInfo.geburtsdatum).toLocaleDateString("de-DE")}`
      : "";

    const systemPrompt = `Du bist ein erfahrener Pflegefachkraft und hilfst beim Verfassen strukturierter Arztbriefe für den deutschen Gesundheitssektor. Deine Briefe sind professionell, präzise, sachlich und klar strukturiert. Du verwendest medizinische Fachterminologie korrekt und schreibst in einem formellen deutschen Stil. Alle Angaben basieren ausschließlich auf den vom Nutzer bereitgestellten Informationen – du erfindest keine medizinischen Details.`;

    const userPrompt = `Erstelle einen strukturierten Arztbrief auf Basis folgender Informationen:

Patient: ${patientInfo.vorname} ${patientInfo.nachname}${geburtsText ? `, ${geburtsText}` : ""}
${pflegegradText}
Anlass: ${ANLASS_LABELS[anlass]}

Bekannte Diagnosen:
${diagnosen.length > 0 ? diagnosen.map((d) => `- ${d}`).join("\n") : "- Keine Diagnosen angegeben"}

Aktuelle Medikation:
${medikamente.length > 0 ? medikamente.map((m) => `- ${m}`).join("\n") : "- Keine Medikamente angegeben"}

Aktuelle Symptome / Anlass der Vorstellung:
${aktuelleSymptome}

Erstelle den Arztbrief mit folgender Struktur:

Arztbrief — ${today}
Patient: ${patientInfo.vorname} ${patientInfo.nachname}${geburtsText ? `, ${geburtsText}` : ""}
${pflegegradText}

Diagnosen:
[Liste der Diagnosen]

Aktuelle Medikation:
[Liste der Medikamente]

Anlass: ${ANLASS_LABELS[anlass]}

Aktueller Befund:
[Strukturierte Zusammenfassung der aktuellen Beschwerden und des Pflegezustands – 3-5 Sätze]

Empfehlungen:
[2-4 konkrete medizinische und pflegerische Empfehlungen, nummeriert]

Bitte schreibe nur den eigentlichen Brieftext, keine Metakommentare.`;

    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const briefText =
      message.content[0].type === "text"
        ? message.content[0].text
        : "Fehler bei der Generierung";

    return NextResponse.json({
      briefText,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("arztbrief POST error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

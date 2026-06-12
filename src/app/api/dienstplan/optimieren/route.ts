import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic();

const OptimierenSchema = z.object({
  woche_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  optimierungsziel: z.enum(["ausgewogen", "kostenminimal", "qualitaetsmaximum", "ruhezeiten"]).default("ausgewogen"),
  // Optional: existing team info for context
  team: z.array(z.object({
    profile_id: z.string().uuid(),
    name: z.string().max(100),
    qualifikation: z.string().max(100).optional(),
    wochenstunden: z.number().min(0).max(80).optional(),
    verfuegbar: z.array(z.string()).optional(), // ["Mo","Di","Mi"]
  })).max(50),
  offene_schichten: z.array(z.object({
    datum: z.string(),
    schichttyp: z.enum(["frueh", "spaet", "nacht", "bereitschaft"]),
    qualifikation_erforderlich: z.string().optional(),
  })).max(100),
});

/** POST /api/dienstplan/optimieren — KI-Vorschlag generieren */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (!profile || profile.role !== "anbieter") {
      return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = OptimierenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validierungsfehler", details: parsed.error.flatten() }, { status: 400 });
    }

    const { woche_start, optimierungsziel, team, offene_schichten } = parsed.data;

    const zielBeschreibung: Record<string, string> = {
      ausgewogen: "faire Verteilung der Schichten auf alle Mitarbeiter",
      kostenminimal: "Minimierung von Überstunden und Wochenendschichten",
      qualitaetsmaximum: "Bevorzugung höher qualifizierter Mitarbeiter für anspruchsvollere Schichten",
      ruhezeiten: "strikte Einhaltung gesetzlicher Ruhezeiten (11h zwischen Schichten, max. 6 Tage/Woche)",
    };

    const prompt = `Du bist ein Schichtplanungs-Experte für ambulante und stationäre Pflegedienste in Deutschland.

Erstelle einen optimierten Dienstplan für die Woche ab ${woche_start}.
Optimierungsziel: ${zielBeschreibung[optimierungsziel]}

Team (${team.length} Mitarbeiter):
${team.map(t => `- ${t.name} (${t.qualifikation ?? "keine Angabe"}, ${t.wochenstunden ?? "?"} h/Woche, verfügbar: ${(t.verfuegbar ?? ["Mo","Di","Mi","Do","Fr"]).join(",")})`).join("\n")}

Offene Schichten (${offene_schichten.length}):
${offene_schichten.map(s => `- ${s.datum} ${s.schichttyp}${s.qualifikation_erforderlich ? ` [${s.qualifikation_erforderlich}]` : ""}`).join("\n")}

Antworte NUR mit einem JSON-Objekt ohne Markdown:
{
  "eintraege": [
    {
      "mitarbeiter_name": "Name des Mitarbeiters",
      "datum": "YYYY-MM-DD",
      "schicht_beginn": "HH:MM",
      "schicht_ende": "HH:MM",
      "schichttyp": "frueh|spaet|nacht|bereitschaft|frei",
      "notiz": "Optionale Notiz"
    }
  ],
  "begruendung": "Kurze Erklärung der Planungsentscheidungen (max. 500 Zeichen)",
  "warnungen": ["Ggf. Hinweise auf Konflikte oder Ruhezeiten-Probleme"]
}`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    let kiAntwort: { eintraege: unknown[]; begruendung: string; warnungen?: string[] };
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      kiAntwort = JSON.parse(jsonMatch?.[0] ?? "{}");
    } catch {
      kiAntwort = { eintraege: [], begruendung: raw.slice(0, 500) };
    }

    // Map KI output back to team profile_ids by name
    const nameToId = Object.fromEntries(team.map(t => [t.name.toLowerCase(), t.profile_id]));
    const eintraege = Array.isArray(kiAntwort.eintraege)
      ? kiAntwort.eintraege
          .map((e: unknown) => {
            const entry = e as Record<string, unknown>;
            const pid = nameToId[(String(entry.mitarbeiter_name ?? "")).toLowerCase()];
            if (!pid) return null;
            return {
              mitarbeiter_profile_id: pid,
              datum: entry.datum,
              schicht_beginn: entry.schicht_beginn,
              schicht_ende: entry.schicht_ende,
              schichttyp: entry.schichttyp ?? "frueh",
              notiz: entry.notiz ?? null,
              ki_vorschlag: true,
            };
          })
          .filter(Boolean)
      : [];

    return NextResponse.json({
      eintraege,
      ki_begruendung: kiAntwort.begruendung ?? "",
      warnungen: kiAntwort.warnungen ?? [],
    });
  } catch (err) {
    logger.error("POST /api/dienstplan/optimieren error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

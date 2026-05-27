import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { matchLiveinAgenturen } from "@/lib/livein/matching";
import { z } from "zod";
import { logger } from "@/lib/logger";

const AnfrageSchema = z.object({
  agentur_id: z.string().uuid(),
  pflegegrad: z.number().int().min(1).max(5),
  diagnosen: z.array(z.string()).optional(),
  besondere_anforderungen: z.string().max(2000).optional(),
  bevorzugtes_geschlecht: z.string().optional(),
  sprache_bevorzugt: z.string().optional(),
  fuehrerschein_noetig: z.boolean().default(false),
  demenz_pflege: z.boolean().default(false),
  haustiere_vorhanden: z.boolean().default(false),
  unterkunft_beschreibung: z.string().max(500).optional(),
  startdatum: z.string().optional(),
  budget_monat: z.number().optional(),
  bundesland: z.string().optional(),
  ort: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pflegegrad = parseInt(searchParams.get("pflegegrad") ?? "2");
    const demenz = searchParams.get("demenz") === "true";
    const budget = searchParams.get("budget")
      ? parseInt(searchParams.get("budget")!)
      : undefined;
    const sprache = searchParams.get("sprache") ?? undefined;

    const agenturen = await matchLiveinAgenturen({
      pflegegrad,
      demenz_pflege: demenz,
      fuehrerschein_noetig: false,
      haustiere_vorhanden: false,
      sprache_bevorzugt: sprache,
      budget_monat: budget,
    });

    return NextResponse.json({ agenturen });
  } catch (error) {
    logger.error("Live-in matching error", { error });
    return NextResponse.json(
      { error: "Matching fehlgeschlagen" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const body = await req.json();
    const parsed = AnfrageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Daten", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("livein_anfragen")
      .insert({ ...parsed.data, user_id: user.id })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json(
      { id: data.id, message: "Anfrage erfolgreich gestellt" },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Live-in Anfrage error", { error });
    return NextResponse.json(
      { error: "Anfrage fehlgeschlagen" },
      { status: 500 }
    );
  }
}

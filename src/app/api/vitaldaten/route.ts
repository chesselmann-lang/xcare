import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const VitalSchema = z.object({
  typ: z.enum([
    "blutdruck_systolisch",
    "blutdruck_diastolisch",
    "puls",
    "temperatur",
    "gewicht",
    "blutzucker",
    "sauerstoffsaettigung",
    "atemfrequenz",
    "schmerz_score",
    "mobilitaet_score",
    "stimmung_score",
    "schlaf_stunden",
  ]),
  wert: z.number(),
  einheit: z.string().max(20).optional(),
  gemessen_am: z.string().optional(),
  notizen: z.string().max(500).optional(),
  gemessen_von: z
    .enum(["selbst", "angehoerige", "anbieter", "arzt", "geraet"])
    .default("selbst"),
  pflegebeduerftige_id: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
      .from("vitaldaten")
      .select("*")
      .eq("user_id", user.id)
      .gte("gemessen_am", thirtyDaysAgo)
      .order("gemessen_am", { ascending: false });

    if (error) throw error;

    // Group by type
    const grouped: Record<
      string,
      Array<{ id: string; wert: number; einheit: string | null; gemessen_am: string; notizen: string | null }>
    > = {};

    for (const row of data ?? []) {
      if (!grouped[row.typ]) grouped[row.typ] = [];
      grouped[row.typ].push({
        id: row.id,
        wert: Number(row.wert),
        einheit: row.einheit,
        gemessen_am: row.gemessen_am,
        notizen: row.notizen,
      });
    }

    return NextResponse.json({ grouped, raw: data ?? [] });
  } catch (err) {
    logger.error("vitaldaten GET error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
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
    const parsed = VitalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Eingabe", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("vitaldaten")
      .insert({
        user_id: user.id,
        typ: parsed.data.typ,
        wert: parsed.data.wert,
        einheit: parsed.data.einheit ?? null,
        gemessen_am: parsed.data.gemessen_am ?? new Date().toISOString(),
        notizen: parsed.data.notizen ?? null,
        gemessen_von: parsed.data.gemessen_von,
        pflegebeduerftige_id: parsed.data.pflegebeduerftige_id ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    logger.error("vitaldaten POST error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

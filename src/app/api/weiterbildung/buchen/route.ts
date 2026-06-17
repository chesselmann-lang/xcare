import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { inngest } from "@/lib/inngest";

const BuchungSchema = z.object({
  kurs_id: z.string().uuid(),
  termin_datum: z.string().optional(),
  arbeitgeber_zahlt: z.boolean().default(false),
  preis_bezahlt: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const body = await req.json();
    const parsed = BuchungSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    // Check for existing booking
    const { data: existing } = await supabase
      .from("kurs_buchungen")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("kurs_id", parsed.data.kurs_id)
      .neq("status", "storniert")
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Sie sind bereits für diesen Kurs angemeldet" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("kurs_buchungen")
      .insert({ ...parsed.data, user_id: user.id })
      .select("id")
      .single();

    if (error) throw error;

    // Fire booking confirmation email via Inngest (non-blocking)
    await inngest.send({
      name: "weiterbildung/buchung.created",
      data: { buchung_id: data.id, user_id: user.id },
    });

    return NextResponse.json(
      { id: data.id, message: "Erfolgreich angemeldet!" },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Kurs buchen error", { error });
    return NextResponse.json({ error: "Buchung fehlgeschlagen" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data, error } = await supabase
      .from("kurs_buchungen")
      .select(
        "id, status, termin_datum, erstellt_am, zertifikat_ausgestellt, kurse(titel, kategorie, format, dauer_stunden)"
      )
      .eq("user_id", user.id)
      .order("erstellt_am", { ascending: false })
      .limit(20);

    if (error) throw error;
    return NextResponse.json({ buchungen: data });
  } catch (error) {
    logger.error("Buchungen GET error", { error });
    return NextResponse.json({ error: "Abruf fehlgeschlagen" }, { status: 500 });
  }
}

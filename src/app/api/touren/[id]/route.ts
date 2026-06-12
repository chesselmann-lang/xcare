import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const PatchTourSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  fahrer_id: z.string().uuid().nullable().optional(),
  fahrzeug: z.string().max(100).optional(),
  status: z.enum(["geplant", "aktiv", "abgeschlossen", "storniert"]).optional(),
  start_ort: z.string().max(300).optional(),
  end_ort: z.string().max(300).optional(),
  geplante_km: z.number().min(0).max(9999).nullable().optional(),
  tatsaechliche_km: z.number().min(0).max(9999).nullable().optional(),
  notizen: z.string().max(2000).optional(),
});

const PatchEinsatzSchema = z.object({
  einsatz_id: z.string().uuid(),
  status: z.enum(["geplant", "angekommen", "abgeschlossen", "nicht_angetroffen", "storniert"]).optional(),
  tatsaechliche_ankunft: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  tatsaechliche_abfahrt: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  pflegedokumentation: z.string().max(3000).optional(),
  abwesenheitsgrund: z.string().max(500).optional(),
});

/** GET /api/touren/[id] — full detail with sorted Einsätze */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data, error } = await supabase
      .from("touren")
      .select(`
        *,
        fahrer:profiles!fahrer_id(id, vorname, nachname),
        tour_einsaetze(*, bewohner:bewohner!bewohner_id(vorname, nachname, zimmer_nr))
      `)
      .eq("id", id)
      .single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    logger.error("GET /api/touren/[id] error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** PATCH /api/touren/[id] — update tour or a single Einsatz */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const body = await req.json().catch(() => null);

    // Check if this is an Einsatz update
    if (body?.einsatz_id) {
      const parsed = PatchEinsatzSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Validierungsfehler", details: parsed.error.flatten() }, { status: 400 });
      }
      const { einsatz_id, ...updates } = parsed.data;
      const { data, error } = await supabase
        .from("tour_einsaetze")
        .update(updates)
        .eq("id", einsatz_id)
        .eq("tour_id", id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    // Tour update
    const parsed = PatchTourSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validierungsfehler", details: parsed.error.flatten() }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("touren")
      .update(parsed.data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    logger.error("PATCH /api/touren/[id] error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** DELETE /api/touren/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { error } = await supabase.from("touren").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ erfolg: true });
  } catch (err) {
    logger.error("DELETE /api/touren/[id] error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const PatchSchema = z.object({
  wert: z.number().optional(),
  zielwert: z.number().optional().nullable(),
  bewertung: z.enum(["gut","akzeptabel","verbesserungsbedarf","kritisch","neutral"]).optional(),
  trend: z.enum(["steigend","stabil","fallend"]).optional(),
  notiz: z.string().max(1000).optional().nullable(),
  quelle: z.string().max(200).optional().nullable(),
});

/** PATCH /api/qualitaetsindikatoren/[id] */
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
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validierungsfehler", details: parsed.error.flatten() }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v !== undefined) patch[k] = v;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("qualitaetsindikatoren")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
      throw error;
    }
    return NextResponse.json(data);
  } catch (err) {
    logger.error("PATCH /api/qualitaetsindikatoren/[id] error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** DELETE /api/qualitaetsindikatoren/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { error } = await supabase
      .from("qualitaetsindikatoren")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ erfolg: true });
  } catch (err) {
    logger.error("DELETE /api/qualitaetsindikatoren/[id] error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

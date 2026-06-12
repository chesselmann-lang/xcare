import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const PatchSchema = z.object({
  status: z.enum(["offen", "eingereicht", "genehmigt", "abgelehnt", "storniert"]).optional(),
  eingereicht_am: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  genehmigt_am: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  abrechnungs_referenz: z.string().max(100).optional(),
  einzelpreis_ct: z.number().int().min(0).nullable().optional(),
  menge: z.number().min(0.01).max(9999).optional(),
  leistungsart: z.string().min(1).max(200).optional(),
  leistungsminuten: z.number().int().min(1).max(480).nullable().optional(),
  notizen: z.string().max(1000).nullable().optional(),
  krankenkasse: z.string().max(200).nullable().optional(),
  versicherungsnummer: z.string().max(50).nullable().optional(),
  ik_anbieter: z.string().max(20).nullable().optional(),
  ik_kasse: z.string().max(20).nullable().optional(),
});

/** PATCH /api/leistungsnachweise/[id] */
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

    const { data, error } = await supabase
      .from("leistungsnachweise")
      .update(parsed.data)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    logger.error("PATCH /api/leistungsnachweise/[id] error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** DELETE /api/leistungsnachweise/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { error } = await supabase.from("leistungsnachweise").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ erfolg: true });
  } catch (err) {
    logger.error("DELETE /api/leistungsnachweise/[id] error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

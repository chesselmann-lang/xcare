import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const PatchSchema = z.object({
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  beginn: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  ende: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  pause_min: z.number().int().min(0).max(480).optional(),
  taetigkeit: z.string().min(1).max(500).optional(),
  kategorie: z.enum(["pflege","hauswirtschaft","begleitung","verwaltung","sonstiges"]).optional(),
  status: z.enum(["offen","bestaetigt","abgerechnet"]).optional(),
  notiz: z.string().max(1000).optional().nullable(),
});

async function getAnbieterId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data: profile } = await supabase.from("profiles").select("id, role").eq("user_id", userId).single();
  if (!profile || profile.role !== "anbieter") return null;
  const { data: anbieter } = await supabase.from("anbieter").select("id").eq("profile_id", profile.id).single();
  return anbieter?.id ?? null;
}

/** PATCH /api/arbeitszeit/[id] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const anbieter_id = await getAnbieterId(supabase, user.id);
    if (!anbieter_id) return NextResponse.json({ error: "Nur Anbieter können Zeiten bearbeiten" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validierungsfehler", details: parsed.error.flatten() }, { status: 400 });
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("arbeitszeit")
      .update(parsed.data)
      .eq("id", id)
      .eq("anbieter_id", anbieter_id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
      throw error;
    }
    return NextResponse.json(data);
  } catch (err) {
    logger.error("PATCH /api/arbeitszeit/[id] error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** DELETE /api/arbeitszeit/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const anbieter_id = await getAnbieterId(supabase, user.id);
    if (!anbieter_id) return NextResponse.json({ error: "Nur Anbieter können Zeiten löschen" }, { status: 403 });

    const { error } = await supabase
      .from("arbeitszeit")
      .delete()
      .eq("id", id)
      .eq("anbieter_id", anbieter_id);

    if (error) throw error;
    return NextResponse.json({ erfolg: true });
  } catch (err) {
    logger.error("DELETE /api/arbeitszeit/[id] error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

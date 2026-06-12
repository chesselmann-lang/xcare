import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const PatchSchema = z.object({
  pinned: z.boolean().optional(),
  erledigt: z.boolean().optional(),
  inhalt: z.string().min(1).max(2000).optional(),
  typ: z.enum(["notiz", "aufgabe", "update", "wichtig"]).optional(),
});

/** PATCH /api/pinnwand/[id] — toggle pin, mark done, update content */
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
    if (parsed.data.pinned !== undefined) patch.pinned = parsed.data.pinned;
    if (parsed.data.erledigt !== undefined) {
      patch.erledigt = parsed.data.erledigt;
      patch.erledigt_am = parsed.data.erledigt ? new Date().toISOString() : null;
    }
    if (parsed.data.inhalt !== undefined) patch.inhalt = parsed.data.inhalt;
    if (parsed.data.typ !== undefined) patch.typ = parsed.data.typ;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("familie_pinnwand")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (err) {
    logger.error("PATCH /api/pinnwand/[id] error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** DELETE /api/pinnwand/[id] */
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
      .from("familie_pinnwand")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ erfolg: true });
  } catch (err) {
    logger.error("DELETE /api/pinnwand/[id] error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

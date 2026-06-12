import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const PatchSchema = z.object({
  status: z.enum(["entwurf", "aktiv", "archiviert"]).optional(),
  bestaetigt: z.boolean().optional(),         // confirm a single Eintrag
  eintrag_id: z.string().uuid().optional(),    // required when bestaetigt provided
});

/** PATCH /api/dienstplan/[id] — update Vorschlag status or confirm Eintrag */
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

    // Confirm a single Eintrag
    if (parsed.data.bestaetigt !== undefined && parsed.data.eintrag_id) {
      const { data, error } = await supabase
        .from("dienstplan_eintraege")
        .update({
          bestaetigt: parsed.data.bestaetigt,
          bestaetigt_am: parsed.data.bestaetigt ? new Date().toISOString() : null,
        })
        .eq("id", parsed.data.eintrag_id)
        .eq("vorschlag_id", id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    // Update Vorschlag status
    if (parsed.data.status) {
      const { data, error } = await supabase
        .from("dienstplan_vorschlaege")
        .update({ status: parsed.data.status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
  } catch (err) {
    logger.error("PATCH /api/dienstplan/[id] error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/** DELETE /api/dienstplan/[id] */
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
      .from("dienstplan_vorschlaege")
      .delete()
      .eq("id", id);
    if (error) throw error;

    return NextResponse.json({ erfolg: true });
  } catch (err) {
    logger.error("DELETE /api/dienstplan/[id] error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

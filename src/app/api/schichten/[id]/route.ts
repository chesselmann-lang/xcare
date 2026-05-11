import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const PatchSchema = z.object({
  status: z.enum(["geplant", "bestaetigt", "abgesagt", "abgeschlossen"]).optional(),
  absage_grund: z.string().max(500).optional(),
  titel: z.string().max(200).optional(),
  beschreibung: z.string().max(2000).optional(),
  start_ts: z.string().datetime().optional(),
  ende_ts: z.string().datetime().optional(),
  stundensatz_ct: z.number().int().min(0).max(100000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (profile?.role !== "anbieter") {
      return NextResponse.json({ error: "Nur für Anbieter" }, { status: 403 });
    }

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Anbieter nicht gefunden" }, { status: 404 });

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    const d = parsed.data;

    const updates: Record<string, unknown> = { ...d };
    if (d.status === "bestaetigt") updates.bestaetigt_am = new Date().toISOString();
    if (d.status === "abgesagt") updates.abgesagt_am = new Date().toISOString();

    const { data: schicht, error } = await supabase
      .from("schichten")
      .update(updates)
      .eq("id", params.id)
      .eq("anbieter_id", anbieter.id)
      .select()
      .single();

    if (error) throw error;
    if (!schicht) return NextResponse.json({ error: "Schicht nicht gefunden" }, { status: 404 });
    return NextResponse.json(schicht);
  } catch (err) {
    logger.error("schichten PATCH error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (profile?.role !== "anbieter") {
      return NextResponse.json({ error: "Nur für Anbieter" }, { status: 403 });
    }

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Anbieter nicht gefunden" }, { status: 404 });

    // Nur geplante Schichten löschbar
    const { data: existing } = await supabase
      .from("schichten")
      .select("id, status")
      .eq("id", params.id)
      .eq("anbieter_id", anbieter.id)
      .single();

    if (!existing) return NextResponse.json({ error: "Schicht nicht gefunden" }, { status: 404 });
    if (existing.status === "abgeschlossen") {
      return NextResponse.json({ error: "Abgeschlossene Schichten können nicht gelöscht werden" }, { status: 409 });
    }

    const { error } = await supabase
      .from("schichten")
      .delete()
      .eq("id", params.id)
      .eq("anbieter_id", anbieter.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("schichten DELETE error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

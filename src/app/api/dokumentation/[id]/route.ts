import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const PatchSchema = z.object({
  unterschrieben: z.boolean().optional(),
  titel: z.string().max(200).optional(),
  inhalt: z.string().min(1).max(5000).optional(),
});

/**
 * PATCH /api/dokumentation/[id]
 * Anbieter kann Eintrag signieren (unterschrieben=true) oder Inhalt korrigieren.
 */
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

    const updates: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.unterschrieben === true) {
      updates.unterschrift_ts = new Date().toISOString();
    }

    const { data: entry, error } = await supabase
      .from("pflegedokumentation")
      .update(updates)
      .eq("id", params.id)
      .eq("anbieter_id", anbieter.id)
      .select()
      .single();

    if (error) throw error;
    if (!entry) return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
    return NextResponse.json(entry);
  } catch (err) {
    logger.error("dokumentation PATCH error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/**
 * DELETE /api/dokumentation/[id]
 * Anbieter löscht eigenen Eintrag (nur unsignierte Einträge).
 */
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

    // Prüfe ob Eintrag bereits signiert ist
    const { data: existing } = await supabase
      .from("pflegedokumentation")
      .select("id, unterschrieben")
      .eq("id", params.id)
      .eq("anbieter_id", anbieter.id)
      .single();

    if (!existing) return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });
    if (existing.unterschrieben) {
      return NextResponse.json({ error: "Signierte Einträge können nicht gelöscht werden" }, { status: 409 });
    }

    const { error } = await supabase
      .from("pflegedokumentation")
      .delete()
      .eq("id", params.id)
      .eq("anbieter_id", anbieter.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("dokumentation DELETE error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

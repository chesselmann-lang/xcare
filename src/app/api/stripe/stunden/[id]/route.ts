import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const PatchSchema = z.object({
  status: z.enum(["approved", "rejected"]).optional(),
});

/**
 * PATCH /api/stripe/stunden/[id]
 * Familie genehmigt oder lehnt Stundennachweis ab.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id, role").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    // Stundennachweis laden
    const { data: sn } = await supabase
      .from("stundennachweise")
      .select("id, status, familie_profile_id, anbieter_id")
      .eq("id", id)
      .single();
    if (!sn) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    // Berechtigung: Familie darf approve/reject nur eigene Einträge
    if (profile.role === "familie" && sn.familie_profile_id !== profile.id) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    // Anbieter darf nichts ändern (Anbieter erstellt, Familie genehmigt)
    if (profile.role === "anbieter") {
      return NextResponse.json({ error: "Nur Familie kann genehmigen" }, { status: 403 });
    }

    if (sn.status !== "pending") {
      return NextResponse.json({ error: "Status kann nicht geändert werden" }, { status: 409 });
    }

    const update: Record<string, unknown> = { status: parsed.data.status };
    if (parsed.data.status === "approved") update.approved_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("stundennachweise")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(updated);
  } catch (err) {
    logger.error("stunden PATCH error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

/**
 * DELETE /api/stripe/stunden/[id]
 * Anbieter löscht pending Stundennachweis.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { data: sn } = await supabase
      .from("stundennachweise")
      .select("id, status, anbieter_id")
      .eq("id", id)
      .single();

    if (!sn || sn.anbieter_id !== anbieter?.id) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }
    if (!["pending", "rejected"].includes(sn.status)) {
      return NextResponse.json({ error: "Kann nur pending/rejected Einträge löschen" }, { status: 409 });
    }

    await supabase.from("stundennachweise").delete().eq("id", id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    logger.error("stunden DELETE error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

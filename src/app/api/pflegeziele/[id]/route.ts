import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const PatchZielSchema = z.object({
  titel: z.string().min(1).max(200).optional(),
  beschreibung: z.string().max(2000).optional(),
  bereich: z.enum(["koerperpflege","ernaehrung","mobilitaet","kognition","soziales","schmerz","wunden","medikamente","allgemein"]).optional(),
  prioritaet: z.enum(["niedrig","mittel","hoch","dringend"]).optional(),
  status: z.enum(["aktiv","erreicht","pausiert","abgebrochen"]).optional(),
  zieldatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

const MassnahmeSchema = z.object({
  action: z.literal("massnahme"),
  beschreibung: z.string().min(1).max(1000),
  haeufigkeit: z.string().max(100).optional(),
  verantwortlich: z.string().max(200).optional(),
});

const EvaluationSchema = z.object({
  action: z.literal("evaluation"),
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ergebnis: z.enum(["verbessert","unveraendert","verschlechtert","erreicht"]),
  notiz: z.string().max(2000).optional(),
});

const MassnahmeToggleSchema = z.object({
  action: z.literal("toggle_massnahme"),
  massnahme_id: z.string().uuid(),
  erledigt: z.boolean(),
});

const PatchSchema = z.discriminatedUnion("action", [MassnahmeSchema, EvaluationSchema, MassnahmeToggleSchema])
  .or(PatchZielSchema);

async function getAnbieterId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data: profile } = await supabase.from("profiles").select("id, role").eq("user_id", userId).single();
  if (!profile || profile.role !== "anbieter") return null;
  const { data: anbieter } = await supabase.from("anbieter").select("id").eq("profile_id", profile.id).single();
  return anbieter?.id ?? null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const anbieterId = await getAnbieterId(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Nur für Anbieter" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validierungsfehler", details: parsed.error.flatten() }, { status: 400 });

    const data = parsed.data;

    // Sub-actions
    if ("action" in data) {
      if (data.action === "massnahme") {
        const { data: m, error } = await supabase
          .from("pflegeziel_massnahmen")
          .insert({ ziel_id: id, beschreibung: data.beschreibung, haeufigkeit: data.haeufigkeit, verantwortlich: data.verantwortlich })
          .select().single();
        if (error) throw error;
        return NextResponse.json(m, { status: 201 });
      }
      if (data.action === "evaluation") {
        const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
        const { data: ev, error } = await supabase
          .from("pflegeziel_evaluationen")
          .insert({ ziel_id: id, datum: data.datum, ergebnis: data.ergebnis, notiz: data.notiz, erstellt_von: profile?.id })
          .select().single();
        if (error) throw error;
        // If evaluation = "erreicht", auto-update ziel status
        if (data.ergebnis === "erreicht") {
          await supabase.from("pflegeziele").update({ status: "erreicht", erreicht_am: data.datum }).eq("id", id).eq("anbieter_id", anbieterId);
        }
        return NextResponse.json(ev, { status: 201 });
      }
      if (data.action === "toggle_massnahme") {
        const patch = { erledigt: data.erledigt, erledigt_am: data.erledigt ? new Date().toISOString() : null };
        const { data: m, error } = await supabase
          .from("pflegeziel_massnahmen")
          .update(patch)
          .eq("id", data.massnahme_id)
          .select().single();
        if (error) throw error;
        return NextResponse.json(m);
      }
    }

    // Plain ziel field update
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) patch[k] = v;
    }
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });

    const { data: updated, error } = await supabase
      .from("pflegeziele")
      .update(patch)
      .eq("id", id)
      .eq("anbieter_id", anbieterId)
      .select().single();
    if (error) { if (error.code === "PGRST116") return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 }); throw error; }
    return NextResponse.json(updated);
  } catch (err) {
    logger.error("PATCH /api/pflegeziele/[id] error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const anbieterId = await getAnbieterId(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Nur für Anbieter" }, { status: 403 });

    const { error } = await supabase.from("pflegeziele").delete().eq("id", id).eq("anbieter_id", anbieterId);
    if (error) throw error;
    return NextResponse.json({ erfolg: true });
  } catch (err) {
    logger.error("DELETE /api/pflegeziele/[id] error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

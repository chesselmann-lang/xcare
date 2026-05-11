import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";

const PatchSchema = z.object({
  erfuellt: z.boolean().nullable().optional(),
  nachweis: z.string().max(2000).optional(),
  faellig_am: z.string().optional(),
  kriterium: z.string().max(500).optional(),
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
    if (profile?.role !== "anbieter") return NextResponse.json({ error: "Nur für Anbieter" }, { status: 403 });

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Anbieter nicht gefunden" }, { status: 404 });

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const updates: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.erfuellt === true) {
      updates.letzte_pruefung = new Date().toISOString().slice(0, 10);
    }

    const { data, error } = await supabase
      .from("compliance_checks")
      .update(updates)
      .eq("id", params.id)
      .eq("anbieter_id", anbieter.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    logger.error("compliance PATCH error", { error: err instanceof Error ? err.message : String(err) });
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
    if (profile?.role !== "anbieter") return NextResponse.json({ error: "Nur für Anbieter" }, { status: 403 });

    const { data: anbieter } = await supabase
      .from("anbieter").select("id").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Anbieter nicht gefunden" }, { status: 404 });

    const { error } = await supabase
      .from("compliance_checks")
      .delete()
      .eq("id", params.id)
      .eq("anbieter_id", anbieter.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("compliance DELETE error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

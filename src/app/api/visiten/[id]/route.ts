import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

async function getAnbieter(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await (supabase as any).from("anbieter").select("id").eq("owner_id", userId).single();
  return (data as any)?.id ?? null;
}

// PATCH /api/visiten/[id] — Status + Aufgabe erledigen
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const anbieterId = await getAnbieter(supabase, user.id);
    if (!anbieterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { status, aufgabe_id, erledigt } = body;

    // Aufgabe erledigen
    if (aufgabe_id !== undefined) {
      const { error } = await (supabase as any)
        .from("visite_aufgaben")
        .update({ erledigt: erledigt ?? true, erledigt_am: erledigt ? new Date().toISOString() : null })
        .eq("id", aufgabe_id)
        .eq("anbieter_id", anbieterId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    // Visite-Status
    const update: Record<string, unknown> = {};
    if (status) {
      update.status = status;
      if (status === "durchgefuehrt") update.durchgefuehrt_von = user.id;
    }

    const { data: raw, error } = await (supabase as any)
      .from("pflegevisiten")
      .update(update)
      .eq("id", id)
      .eq("anbieter_id", anbieterId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ visite: raw as any });
  } catch (err) {
    logger.error("PATCH /api/visiten/[id]", { error: err });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

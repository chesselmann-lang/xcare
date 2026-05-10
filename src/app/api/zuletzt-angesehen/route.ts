import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const { anbieterId } = await req.json();
    if (!anbieterId) return NextResponse.json({ ok: false }, { status: 400 });

    // Get Familie profile id
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    // Only track for Familie users
    if (!profile || profile.role !== "familie") {
      return NextResponse.json({ ok: false });
    }

    // Upsert: update gesehen_am if already exists
    await supabase
      .from("anbieter_zuletzt_angesehen")
      .upsert(
        { familie_id: profile.id, anbieter_id: anbieterId, gesehen_am: new Date().toISOString() },
        { onConflict: "familie_id,anbieter_id" }
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("zuletzt-angesehen error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

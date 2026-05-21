import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET  /api/profil/email-prefs  — Return current preferences
 * PUT  /api/profil/email-prefs  — Merge preference patch
 */

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("profiles")
      .select("email_prefs")
      .eq("user_id", user.id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ prefs: data?.email_prefs ?? {} });
  } catch (err) {
    logger.error("[email-prefs GET] Unexpected error:", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    // Only allow boolean values; strip unknown keys
    const allowed = ["digest", "neue_anfrage", "statusupdate", "neue_nachricht", "bewertung", "wiedervorlage"] as const;
    const patch: Record<string, boolean> = {};
    for (const key of allowed) {
      if (typeof body[key] === "boolean") patch[key] = body[key];
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Keine gültigen Felder übergeben" }, { status: 400 });
    }

    // Merge: fetch existing prefs, apply patch
    const { data: existing } = await supabase
      .from("profiles")
      .select("email_prefs")
      .eq("user_id", user.id)
      .single();

    const merged = { ...(existing?.email_prefs ?? {}), ...patch };

    const { error } = await supabase
      .from("profiles")
      .update({ email_prefs: merged, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, prefs: merged });
  } catch (err) {
    logger.error("[email-prefs PUT] Unexpected error:", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

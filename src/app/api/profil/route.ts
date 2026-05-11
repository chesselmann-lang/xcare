import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/profil — eigenes Profil laden
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ profile: data });
  } catch (err) {
    console.error("[profil GET] Unexpected error:", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

/**
 * PATCH /api/profil — Profil-Felder aktualisieren
 * Erlaubte Felder: vorname, nachname, telefon, ui_modus
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;

    // Nur erlaubte Felder übernehmen
    const allowed = ["vorname", "nachname", "telefon", "ui_modus"] as const;
    const patch: Partial<Record<typeof allowed[number], unknown>> = {};
    for (const key of allowed) {
      if (key in body) {
        patch[key] = body[key];
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Keine gültigen Felder" }, { status: 400 });
    }

    // ui_modus validieren
    if ("ui_modus" in patch) {
      const validModi = ["senior", "standard", "profi", "familie"];
      if (!validModi.includes(patch.ui_modus as string)) {
        return NextResponse.json({ error: "Ungültiger ui_modus" }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ profile: data });
  } catch (err) {
    console.error("[profil PATCH] Unexpected error:", err);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

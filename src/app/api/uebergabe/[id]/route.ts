import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * PATCH /api/uebergabe/[id]
 * Digitale Bestätigung / Sign-off der Übergabe durch die übernehmende Pflegekraft
 * oder die Familie. Setzt bestaetigt=true, bestaetigt_am=now.
 *
 * DELETE /api/uebergabe/[id]
 * Nur der Anbieter darf eigene Protokolle löschen (innerhalb 24h).
 */

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Fehlende ID" }, { status: 400 });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("user_id", user.id)
      .single();
    if (!profile)
      return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });

    // Load the protokoll to check ownership / access
    const { data: protokoll } = await supabase
      .from("uebergabeprotokolle")
      .select("id, anbieter_id, familie_profile_id, bestaetigt")
      .eq("id", id)
      .single();

    if (!protokoll)
      return NextResponse.json({ error: "Protokoll nicht gefunden" }, { status: 404 });

    // Access check: anbieter role must own it; familie must be the recipient
    if (profile.role === "anbieter") {
      const { data: anbieter } = await supabase
        .from("anbieter")
        .select("id")
        .eq("profile_id", profile.id)
        .single();
      if (!anbieter || anbieter.id !== protokoll.anbieter_id)
        return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
    } else if (profile.role === "familie") {
      if (protokoll.familie_profile_id !== profile.id)
        return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
    } else {
      return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
    }

    if (protokoll.bestaetigt) {
      return NextResponse.json(
        { error: "Bereits bestätigt" },
        { status: 409 }
      );
    }

    const { data: updated, error } = await supabase
      .from("uebergabeprotokolle")
      .update({
        bestaetigt: true,
        bestaetigt_am: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(updated);
  } catch (err) {
    logger.error("uebergabe PATCH error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Fehlende ID" }, { status: 400 });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("user_id", user.id)
      .single();
    if (profile?.role !== "anbieter")
      return NextResponse.json({ error: "Nur Anbieter dürfen Protokolle löschen" }, { status: 403 });

    const { data: anbieter } = await supabase
      .from("anbieter")
      .select("id")
      .eq("profile_id", profile.id)
      .single();
    if (!anbieter)
      return NextResponse.json({ error: "Anbieter nicht gefunden" }, { status: 404 });

    const { data: protokoll } = await supabase
      .from("uebergabeprotokolle")
      .select("id, anbieter_id, erstellt_am")
      .eq("id", id)
      .single();

    if (!protokoll)
      return NextResponse.json({ error: "Protokoll nicht gefunden" }, { status: 404 });
    if (protokoll.anbieter_id !== anbieter.id)
      return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });

    // Only allow deletion within 24 hours of creation
    const age = Date.now() - new Date(protokoll.erstellt_am).getTime();
    if (age > 24 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: "Protokolle können nur innerhalb von 24 Stunden gelöscht werden." },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("uebergabeprotokolle")
      .delete()
      .eq("id", id);
    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    logger.error("uebergabe DELETE error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

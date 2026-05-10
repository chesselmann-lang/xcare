/**
 * GET /api/profil/export
 *
 * GDPR Art. 20 – Recht auf Datenübertragbarkeit.
 * Returns a structured JSON export of all personal data stored for the
 * authenticated user: profile, anfragen, nachrichten, bewertungen, favoriten,
 * benachrichtigungen, and (if anbieter) the anbieter record + leistungen.
 *
 * The export is returned as a downloadable JSON attachment so the browser
 * prompts a Save dialog.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 1. Profile ─────────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });
    }

    // ── 2. Anfragen ────────────────────────────────────────────────────────
    const { data: anfragen } = await supabase
      .from("anfragen")
      .select("id, lebenslage, beschreibung, status, created_at, updated_at")
      .eq("familie_id", profile.id)
      .order("created_at", { ascending: false });

    // ── 3. Nachrichten ─────────────────────────────────────────────────────
    const anfragenIds = (anfragen ?? []).map((a) => a.id);
    let nachrichten: unknown[] = [];
    if (anfragenIds.length > 0) {
      const { data: msgs } = await supabase
        .from("nachrichten")
        .select("id, anfrage_id, inhalt, created_at")
        .in("anfrage_id", anfragenIds)
        .eq("sender_id", profile.id)
        .order("created_at", { ascending: false });
      nachrichten = msgs ?? [];
    }

    // ── 4. Bewertungen (abgegeben) ─────────────────────────────────────────
    const { data: bewertungen } = await supabase
      .from("bewertungen")
      .select("id, anbieter_id, sterne, kommentar, created_at")
      .eq("familie_id", profile.id)
      .order("created_at", { ascending: false });

    // ── 5. Favoriten ───────────────────────────────────────────────────────
    const { data: favoriten } = await supabase
      .from("merkliste")
      .select("anbieter_id, created_at")
      .eq("familie_id", profile.id);

    // ── 6. Benachrichtigungen ──────────────────────────────────────────────
    const { data: benachrichtigungen } = await supabase
      .from("benachrichtigungen")
      .select("id, typ, titel, nachricht, gelesen, created_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(500); // cap to avoid huge exports

    // ── 7. Anbieter data (if applicable) ──────────────────────────────────
    let anbieterData: unknown = null;
    if (profile.role === "anbieter") {
      const { data: anbieter } = await supabase
        .from("anbieter")
        .select("id, name, beschreibung, ort, plz, telefon, email, website, verifiziert, aktiv, created_at")
        .eq("profile_id", profile.id)
        .single();

      if (anbieter) {
        const { data: leistungen } = await supabase
          .from("leistungen")
          .select("id, name, beschreibung, kategorie, aktiv, created_at")
          .eq("anbieter_id", anbieter.id)
          .order("created_at", { ascending: false });

        anbieterData = { ...anbieter, leistungen: leistungen ?? [] };
      }
    }

    // ── 8. Assemble export ─────────────────────────────────────────────────
    const exportData = {
      export_meta: {
        generated_at: new Date().toISOString(),
        platform: "xcare",
        legal_basis: "DSGVO Art. 20 – Recht auf Datenübertragbarkeit",
        user_id: user.id,
      },
      profil: profile,
      anfragen: anfragen ?? [],
      nachrichten,
      bewertungen: bewertungen ?? [],
      favoriten: favoriten ?? [],
      benachrichtigungen: benachrichtigungen ?? [],
      ...(anbieterData ? { anbieter: anbieterData } : {}),
    };

    const json = JSON.stringify(exportData, null, 2);
    const filename = `xcare-export-${new Date().toISOString().split("T")[0]}.json`;

    return new Response(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logger.error("profil/export error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

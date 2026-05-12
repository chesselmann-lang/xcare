/**
 * POST /api/account/loeschen
 *
 * Legt eine DSGVO-Löschanfrage an (Art. 17 DSGVO).
 * Sendet anschließend eine Admin-Benachrichtigung.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });
    }

    // Prüfen ob bereits eine offene Anfrage existiert
    const { data: existing } = await supabase
      .from("dsgvo_loeschanfragen")
      .select("id")
      .eq("profil_id", profile.id)
      .in("status", ["offen", "in_bearbeitung"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Es besteht bereits eine offene Löschanfrage für dieses Konto." },
        { status: 409 }
      );
    }

    // Löschanfrage anlegen
    const { data: anfrage, error: insertErr } = await supabase
      .from("dsgvo_loeschanfragen")
      .insert({
        profil_id: profile.id,
        email: profile.email,
        status: "offen",
      })
      .select()
      .single();

    if (insertErr) {
      logger.error("account/loeschen: insert failed", { error: insertErr.message });
      return NextResponse.json({ error: "Fehler beim Anlegen der Anfrage" }, { status: 500 });
    }

    // Admin-Benachrichtigung senden (best effort)
    try {
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");

      if (admins && admins.length > 0) {
        await supabase.from("benachrichtigungen").insert(
          admins.map((admin) => ({
            profile_id: admin.id,  // Korrekte Spaltenbezeichnung
            titel: "Neue DSGVO-Löschanfrage",
            nachricht: `Nutzer ${profile.email} hat eine Löschanfrage gestellt (Art. 17 DSGVO).`,
            typ: "system",
          }))
        );
      }
    } catch (notifErr) {
      logger.warn("account/loeschen: admin notification failed", {
        error: notifErr instanceof Error ? notifErr.message : String(notifErr),
      });
    }

    logger.info("account/loeschen: Löschanfrage angelegt", {
      profil_id: profile.id,
      anfrage_id: anfrage.id,
    });

    return NextResponse.json({ ok: true, anfrage_id: anfrage.id });
  } catch (err) {
    logger.error("account/loeschen error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

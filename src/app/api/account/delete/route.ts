/**
 * POST /api/account/delete
 *
 * Soft-deletes the authenticated user's account:
 * 1. Sets profiles.deleted_at = NOW()
 * 2. Cancels all open anfragen (status → abgelehnt)
 * 3. Signs the user out
 *
 * Hard-deletion (purge from auth.users + all tables) must be scheduled
 * separately by an admin/cron within 72 h per DSGVO Art. 17.
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

    // 1. Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });
    }

    // 2. Cancel all open anfragen for this user
    const OPEN_STATUSES = ["offen", "in_bearbeitung", "angeboten", "bestaetigt"];
    await supabase
      .from("anfragen")
      .update({ status: "abgelehnt", updated_at: new Date().toISOString() })
      .eq("familie_id", profile.id)
      .in("status", OPEN_STATUSES);

    // 3. Soft-delete the profile
    const { error: deleteError } = await supabase
      .from("profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", profile.id);

    if (deleteError) {
      logger.error("account/delete: failed to soft-delete profile", {
        profile_id: profile.id,
        error: deleteError.message,
      });
      return NextResponse.json({ error: "Fehler beim Löschen" }, { status: 500 });
    }

    // 4. Sign out
    await supabase.auth.signOut();

    logger.info("account/delete: soft-delete completed", { profile_id: profile.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("account/delete error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

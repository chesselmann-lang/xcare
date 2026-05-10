"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { AnfrageStatus } from "@/lib/types";

const STATUS_LABEL: Record<AnfrageStatus, string> = {
  offen:          "Offen",
  in_bearbeitung: "In Bearbeitung",
  angeboten:      "Angebot gemacht",
  bestaetigt:     "Bestätigt",
  abgelehnt:      "Abgelehnt",
  abgeschlossen:  "Abgeschlossen",
};

/**
 * Legal status transitions for the Anbieter role.
 *
 * Business rules:
 *  offen        → in_bearbeitung, angeboten, abgelehnt
 *  in_bearbeitung → angeboten, abgelehnt, abgeschlossen
 *  angeboten    → bestaetigt, abgelehnt, abgeschlossen
 *  bestaetigt   → abgeschlossen, abgelehnt
 *  abgelehnt    → (terminal — no further transitions)
 *  abgeschlossen → (terminal — no further transitions)
 */
const ALLOWED_TRANSITIONS: Record<AnfrageStatus, AnfrageStatus[]> = {
  offen:          ["in_bearbeitung", "angeboten", "abgelehnt"],
  in_bearbeitung: ["angeboten", "abgelehnt", "abgeschlossen"],
  angeboten:      ["bestaetigt", "abgelehnt", "abgeschlossen"],
  bestaetigt:     ["abgeschlossen", "abgelehnt"],
  abgelehnt:      [],
  abgeschlossen:  [],
};

const STATUS_NACHRICHT: Partial<Record<AnfrageStatus, string>> = {
  in_bearbeitung: "Ihre Anfrage wird jetzt bearbeitet.",
  angeboten:      "Sie haben ein neues Angebot erhalten.",
  bestaetigt:     "Ihre Anfrage wurde bestätigt.",
  abgelehnt:      "Ihre Anfrage wurde leider abgelehnt.",
  abgeschlossen:  "Ihre Anfrage wurde abgeschlossen.",
};

export async function statusAendern(anfrageId: string, neuerStatus: AnfrageStatus) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  // Verify the anfrage belongs to this anbieter
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) return { error: "Profil nicht gefunden" };

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  if (!anbieter) return { error: "Anbieter nicht gefunden" };

  // Fetch the anfrage to get familie profile_id
  const { data: anfrage, error: fetchError } = await supabase
    .from("anfragen")
    .select("id, status, familie_id, lebenslage, anbieter:anbieter_id(name)")
    .eq("id", anfrageId)
    .eq("anbieter_id", anbieter.id)
    .single();

  if (fetchError || !anfrage) return { error: "Anfrage nicht gefunden" };
  if (anfrage.status === neuerStatus) return { success: true }; // no-op

  const alterStatus = anfrage.status as AnfrageStatus;

  // State-machine guard — reject illegal transitions
  const allowedNext = ALLOWED_TRANSITIONS[alterStatus] ?? [];
  if (!allowedNext.includes(neuerStatus)) {
    return {
      error: `Statuswechsel von „${STATUS_LABEL[alterStatus]}" zu „${STATUS_LABEL[neuerStatus]}" ist nicht erlaubt.`,
    };
  }

  // Update status
  const { error: updateError } = await supabase
    .from("anfragen")
    .update({ status: neuerStatus, updated_at: new Date().toISOString() })
    .eq("id", anfrageId)
    .eq("anbieter_id", anbieter.id);

  if (updateError) return { error: updateError.message };

  // Log status change into anfragen_historie
  await supabase.from("anfragen_historie").insert({
    anfrage_id: anfrageId,
    alter_status: alterStatus,
    neuer_status: neuerStatus,
  }).then(() => {/* ignore if table missing in older deployments */}).catch(() => {});

  // Send in-app notification to familie if applicable
  const nachrichtText = STATUS_NACHRICHT[neuerStatus];
  if (nachrichtText && anfrage.familie_id) {
    const anbieterName = (anfrage.anbieter as { name?: string } | null)?.name ?? "Der Anbieter";
    await supabase.from("benachrichtigungen").insert({
      profile_id: anfrage.familie_id,
      typ: "statusupdate",
      titel: `Status: ${STATUS_LABEL[neuerStatus]}`,
      nachricht: `${anbieterName}: ${nachrichtText}`,
      link: `/familie/anfragen/${anfrageId}`,
    });
  }

  // Fire Inngest status-changed email notification (non-blocking)
  // Covers both StatusWechselSelect (list) and AnfrageAktionen (detail) paths
  if (neuerStatus !== "offen" && anfrage.familie_id && process.env.INNGEST_EVENT_KEY) {
    const { data: familieProfile } = await supabase
      .from("profiles")
      .select("email, vorname, nachname")
      .eq("id", anfrage.familie_id)
      .single();

    if (familieProfile?.email) {
      const familieName = `${familieProfile.vorname ?? ""} ${familieProfile.nachname ?? ""}`.trim() || "Familie";
      const anbieterName = (anfrage.anbieter as { name?: string } | null)?.name ?? "Der Anbieter";
      fetch(`https://inn.gs/e/${process.env.INNGEST_EVENT_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "anfrage/status-changed",
          data: {
            familie_email: familieProfile.email,
            familie_name:  familieName,
            anbieter_name: anbieterName,
            new_status:    neuerStatus,
            lebenslage:    anfrage.lebenslage ?? "",
            anfrage_id:    anfrageId,
          },
        }),
      }).catch(() => {});
    }
  }

  revalidatePath("/anbieter/anfragen");
  revalidatePath(`/anbieter/anfragen/${anfrageId}`);
  return { success: true };
}

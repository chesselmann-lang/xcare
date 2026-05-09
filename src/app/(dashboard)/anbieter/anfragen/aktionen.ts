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
    .select("id, status, familie_id, anbieter:anbieter_id(name)")
    .eq("id", anfrageId)
    .eq("anbieter_id", anbieter.id)
    .single();

  if (fetchError || !anfrage) return { error: "Anfrage nicht gefunden" };
  if (anfrage.status === neuerStatus) return { success: true }; // no-op

  // Update status
  const { error: updateError } = await supabase
    .from("anfragen")
    .update({ status: neuerStatus, updated_at: new Date().toISOString() })
    .eq("id", anfrageId)
    .eq("anbieter_id", anbieter.id);

  if (updateError) return { error: updateError.message };

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

  revalidatePath("/anbieter/anfragen");
  revalidatePath(`/anbieter/anfragen/${anfrageId}`);
  return { success: true };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/** Resolves the authenticated user's own profile.id from the session. */
async function getOwnProfileId(): Promise<{ profileId: string; supabase: Awaited<ReturnType<typeof createClient>> } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  const { data: profile } = await supabase
    .from("profiles").select("id").eq("user_id", user.id).single();
  if (!profile) return { error: "Profil nicht gefunden" };

  return { profileId: profile.id, supabase };
}

/**
 * Mark all of the authenticated user's unread notifications as read.
 * No parameter accepted — profile is resolved from the session to prevent IDOR.
 */
export async function alleAlsGelesenMarkieren() {
  const result = await getOwnProfileId();
  if ("error" in result) return { error: result.error };
  const { profileId, supabase } = result;

  await supabase
    .from("benachrichtigungen")
    .update({ gelesen: true })
    .eq("profile_id", profileId)
    .eq("gelesen", false);

  revalidatePath("/familie/benachrichtigungen");
  return { success: true };
}

/**
 * Delete a single notification, verified to belong to the authenticated user.
 */
export async function benachrichtigungLoeschen(id: string) {
  const result = await getOwnProfileId();
  if ("error" in result) return { error: result.error };
  const { profileId, supabase } = result;

  // Ownership gate: only delete if this notification belongs to the current user.
  await supabase.from("benachrichtigungen").delete()
    .eq("id", id)
    .eq("profile_id", profileId);

  revalidatePath("/familie/benachrichtigungen");
  return { success: true };
}

/**
 * Delete all notifications for the authenticated user.
 * No parameter accepted — profile is resolved from the session to prevent IDOR.
 */
export async function alleLoeschen() {
  const result = await getOwnProfileId();
  if ("error" in result) return { error: result.error };
  const { profileId, supabase } = result;

  await supabase.from("benachrichtigungen").delete().eq("profile_id", profileId);

  revalidatePath("/familie/benachrichtigungen");
  return { success: true };
}

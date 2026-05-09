"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function alleAlsGelesenMarkieren(profileId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  await supabase
    .from("benachrichtigungen")
    .update({ gelesen: true })
    .eq("profile_id", profileId)
    .eq("gelesen", false);

  revalidatePath("/anbieter/benachrichtigungen");
  return { success: true };
}

export async function benachrichtigungLoeschen(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  await supabase.from("benachrichtigungen").delete().eq("id", id);

  revalidatePath("/anbieter/benachrichtigungen");
  return { success: true };
}

export async function alleLoeschen(profileId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  await supabase.from("benachrichtigungen").delete().eq("profile_id", profileId);

  revalidatePath("/anbieter/benachrichtigungen");
  return { success: true };
}

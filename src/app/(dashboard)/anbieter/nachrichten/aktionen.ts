"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function alleAlsGelesenMarkieren(anfrageIds: string[]) {
  if (anfrageIds.length === 0) return;
  const supabase = await createClient();

  // Verify the caller is an authenticated anbieter and scope the update
  // to only anfragen that actually belong to them (IDOR prevention).
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles").select("id").eq("user_id", user.id).single();
  if (!profile) return;

  const { data: anbieter } = await supabase
    .from("anbieter").select("id").eq("profile_id", profile.id).single();
  if (!anbieter) return;

  // Filter to only anfragen owned by this anbieter.
  const { data: ownedAnfragen } = await supabase
    .from("anfragen")
    .select("id")
    .in("id", anfrageIds)
    .eq("anbieter_id", anbieter.id);

  const ownedIds = ownedAnfragen?.map((a) => a.id) ?? [];
  if (ownedIds.length === 0) return;

  await supabase
    .from("nachrichten")
    .update({ gelesen: true })
    .in("anfrage_id", ownedIds)
    .eq("gelesen", false);

  revalidatePath("/anbieter/nachrichten");
}

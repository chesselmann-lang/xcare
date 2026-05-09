"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function rolleAendern(profileId: string, neueRolle: "familie" | "anbieter") {
  const supabase = await createClient();

  // Verify current user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert" };

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (adminProfile?.role !== "admin") return { error: "Keine Berechtigung" };

  // Prevent modifying another admin
  const { data: target } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .single();

  if (target?.role === "admin") return { error: "Admin-Rollen können nicht geändert werden" };

  const { error } = await supabase
    .from("profiles")
    .update({ role: neueRolle })
    .eq("id", profileId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/nutzer/${profileId}`);
  revalidatePath("/admin/nutzer");
  return { success: true };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function alleAlsGelesenMarkieren(anfrageIds: string[]) {
  if (anfrageIds.length === 0) return;
  const supabase = await createClient();
  await supabase
    .from("nachrichten")
    .update({ gelesen: true })
    .in("anfrage_id", anfrageIds)
    .eq("gelesen", false);
  revalidatePath("/anbieter/nachrichten");
}

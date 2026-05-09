import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BenachrichtigungenClient } from "./benachrichtigungen-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Benachrichtigungen | xcare Anbieter",
};

export default async function AnbieterBenachrichtigungenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "anbieter") redirect("/familie");

  const { data: items } = await supabase
    .from("benachrichtigungen")
    .select("id, typ, titel, nachricht, link, gelesen, created_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <BenachrichtigungenClient
      profileId={profile.id}
      initialItems={items ?? []}
    />
  );
}

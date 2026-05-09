import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BenachrichtigungenClient } from "./benachrichtigungen-client";

export const metadata = {
  title: "Benachrichtigungen | xcare Familie",
};

export default async function FamilieBenachrichtigungenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role === "anbieter") redirect("/anbieter/dashboard");

  const { data: benachrichtigungen } = await supabase
    .from("benachrichtigungen")
    .select("id, typ, titel, nachricht, link, gelesen, created_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <BenachrichtigungenClient
      profileId={profile.id}
      initialItems={benachrichtigungen ?? []}
    />
  );
}

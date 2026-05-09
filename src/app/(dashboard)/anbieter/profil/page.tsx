import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfilFormular from "./profil-formular";

export default async function AnbieterProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profile?.role === "familie") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("*")
    .eq("profile_id", profile?.id)
    .single();

  return <ProfilFormular anbieter={anbieter} profile={profile} />;
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EinstellungenFormular } from "./einstellungen-formular";

export const metadata = { title: "Einstellungen – xcare" };

export default async function EinstellungenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("id, email, role").eq("user_id", user.id).single();
  if (!profile) redirect("/login");

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("profile_id, email_anfragen, email_nachrichten, email_statusupdate, email_wochenbericht")
    .eq("profile_id", profile.id)
    .single();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">Einstellungen</h1>
      <p className="text-[--muted-foreground] text-sm mb-8">Verwalten Sie Ihr Konto und Ihre Benachrichtigungen.</p>
      <EinstellungenFormular profile={profile} prefs={prefs} />
    </div>
  );
}

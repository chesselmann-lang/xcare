import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamVerwaltung } from "./team-verwaltung";

export const metadata = { title: "Team – xcare" };

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "anbieter") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id, name")
    .eq("profile_id", profile.id)
    .single();

  if (!anbieter) redirect("/anbieter/profil");

  const { data: mitglieder } = await supabase
    .from("anbieter_mitglieder")
    .select("*, profiles(vorname, nachname, email)")
    .eq("anbieter_id", anbieter.id)
    .order("created_at");

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-1">Team verwalten</h1>
      <p className="text-[--muted-foreground] text-sm mb-8">
        Laden Sie Mitarbeiter ein, die Anfragen bearbeiten können.
      </p>
      <TeamVerwaltung
        anbieterId={anbieter.id}
        anbieterName={anbieter.name}
        currentProfileId={profile.id}
        initialMitglieder={mitglieder ?? []}
      />
    </div>
  );
}

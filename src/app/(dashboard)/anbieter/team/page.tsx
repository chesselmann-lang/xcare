import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamVerwaltung } from "./team-verwaltung";
import { planFeatureGate } from "@/lib/stripe/features";
import Link from "next/link";

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
    .select("id, name, plan")
    .eq("profile_id", profile.id)
    .single();

  if (!anbieter) redirect("/anbieter/profil");

  const gate = planFeatureGate(anbieter.plan);

  const { data: mitglieder } = await supabase
    .from("anbieter_mitglieder")
    .select("*, profiles(vorname, nachname, email)")
    .eq("anbieter_id", anbieter.id)
    .order("created_at");

  const currentCount = (mitglieder ?? []).length + 1; // +1 for owner
  const atLimit = gate.maxTeamMembers !== null && currentCount >= gate.maxTeamMembers;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-1">Team verwalten</h1>
      <p className="text-[--muted-foreground] text-sm mb-4">
        Laden Sie Mitarbeiter ein, die Anfragen bearbeiten können.
      </p>

      {/* Plan limit banner */}
      {gate.maxTeamMembers !== null && (
        <div className={`mb-6 rounded-lg border px-4 py-3 text-sm flex items-center justify-between gap-4 ${
          atLimit
            ? "bg-amber-50 border-amber-200 text-amber-800"
            : "bg-blue-50 border-blue-200 text-blue-800"
        }`}>
          <span>
            {atLimit
              ? `Sie haben das Limit Ihres Plans erreicht (${gate.maxTeamMembers} Mitglieder).`
              : `Ihr Plan erlaubt bis zu ${gate.maxTeamMembers} Teammitglieder (${currentCount}/${gate.maxTeamMembers} belegt).`}
          </span>
          {atLimit && (
            <Link
              href="/anbieter/abo"
              className="shrink-0 font-semibold underline hover:no-underline"
            >
              Upgrade →
            </Link>
          )}
        </div>
      )}

      <TeamVerwaltung
        anbieterId={anbieter.id}
        anbieterName={anbieter.name}
        currentProfileId={profile.id}
        initialMitglieder={mitglieder ?? []}
        maxTeamMembers={gate.maxTeamMembers}
        currentMemberCount={currentCount}
      />
    </div>
  );
}

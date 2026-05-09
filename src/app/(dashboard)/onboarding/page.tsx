import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata = { title: "Willkommen bei xcare" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, anbieter(*)")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Already onboarded → redirect to appropriate dashboard
  if (profile.onboarding_done) {
    redirect(profile.role === "anbieter" ? "/anbieter/dashboard" : "/familie");
  }

  const anbieter = profile.role === "anbieter"
    ? (profile.anbieter as { id: string; name: string | null; beschreibung: string | null } | null)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[--primary-light]/30 to-white flex items-center justify-center px-4 py-12">
      <OnboardingWizard
        profileId={profile.id}
        role={profile.role as "familie" | "anbieter"}
        vorname={profile.vorname ?? ""}
        nachname={profile.nachname ?? ""}
        anbieter={anbieter}
      />
    </div>
  );
}

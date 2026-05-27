import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PflegegradCoachClient } from "@/components/pflegegrad/PflegegradCoachClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KI Pflegegrad-Coach | xcare Familie",
};

export default async function PflegegradCoachPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "familie") redirect("/");

  // Load or create an in-progress session
  const { data: existing } = await supabase
    .from("pflegegrad_coach_sessions")
    .select("*")
    .eq("familie_profile_id", profile.id)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let session = existing;

  if (!session) {
    const { data: neu } = await supabase
      .from("pflegegrad_coach_sessions")
      .insert({
        familie_profile_id: profile.id,
        antworten: {},
      })
      .select()
      .single();
    session = neu;
  }

  // Load last 5 completed sessions for history
  const { data: completed } = await supabase
    .from("pflegegrad_coach_sessions")
    .select(
      "id, geschaetzter_pflegegrad, nbi_gesamt_punkte, ki_begruendung, completed_at, created_at"
    )
    .eq("familie_profile_id", profile.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(5);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">KI Pflegegrad-Coach</h1>
        <p className="text-sm text-gray-500 mt-1">
          Unser KI-Assistent führt Sie durch alle 6 NBI-Module und schätzt den
          wahrscheinlichen Pflegegrad ein. Dies ersetzt kein offizielles MDK-Gutachten.
        </p>
      </div>
      <PflegegradCoachClient
        sessionId={session?.id}
        savedAnswers={session?.antworten ?? {}}
        previousSessions={completed ?? []}
      />
    </div>
  );
}

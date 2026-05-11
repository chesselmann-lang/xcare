import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UebergabeClient from "@/components/uebergabe/UebergabeClient";

export default async function FamilieUebergabePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "familie") redirect("/");

  const { data: protokolle } = await supabase
    .from("uebergabeprotokolle")
    .select(`
      id, erstellt_am, allgemeinzustand, besonderheiten, offene_aufgaben,
      medikamente_status, vitalwerte_auffaellig, stimmung, bestaetigt, bestaetigt_am,
      familie_profile_id,
      care_workers_von:care_worker_von (vorname, nachname),
      care_workers_bis:care_worker_bis (vorname, nachname)
    `)
    .eq("familie_profile_id", profile.id)
    .order("erstellt_am", { ascending: false })
    .limit(20);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Übergabeprotokolle</h1>
        <p className="text-sm text-gray-500 mt-1">
          Schicht-Übergaben Ihrer Pflegekräfte — transparent & nachvollziehbar
        </p>
      </div>
      <UebergabeClient
        protokolle={protokolle ?? []}
        isAnbieter={false}
      />
    </div>
  );
}

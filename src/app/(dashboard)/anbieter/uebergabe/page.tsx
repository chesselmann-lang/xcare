import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UebergabeClient from "@/components/uebergabe/UebergabeClient";

export default async function AnbieterUebergabePage({
  searchParams,
}: {
  searchParams: Promise<{ familie?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "anbieter") redirect("/");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  const { familie } = await searchParams;

  const [{ data: protokolle }, { data: careWorkers }, { data: familien }] = await Promise.all([
    supabase
      .from("uebergabeprotokolle")
      .select(`
        id, erstellt_am, allgemeinzustand, besonderheiten, offene_aufgaben,
        medikamente_status, vitalwerte_auffaellig, stimmung, bestaetigt, bestaetigt_am,
        familie_profile_id,
        care_workers_von:care_worker_von (vorname, nachname),
        care_workers_bis:care_worker_bis (vorname, nachname)
      `)
      .eq("anbieter_id", anbieter?.id ?? "")
      .order("erstellt_am", { ascending: false })
      .limit(50),
    supabase
      .from("care_workers")
      .select("id, vorname, nachname")
      .eq("anbieter_id", anbieter?.id ?? "")
      .eq("aktiv", true),
    supabase.from("profiles").select("id, vorname, nachname").eq("role", "familie"),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Übergabeprotokolle</h1>
        <p className="text-sm text-gray-500 mt-1">
          Digitale Schicht-Übergabe zwischen Pflegekräften
        </p>
      </div>
      <UebergabeClient
        protokolle={protokolle ?? []}
        careWorkers={careWorkers ?? []}
        isAnbieter={true}
        familieProfileId={familie}
        familieOptionen={familien ?? []}
      />
    </div>
  );
}

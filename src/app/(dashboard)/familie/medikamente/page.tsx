import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MedikamenteClient from "@/components/medikamente/MedikamenteClient";

export default async function FamilieMedikamentePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "familie") redirect("/");

  const { data: medikamente } = await supabase
    .from("medikamentenplaene")
    .select("*")
    .eq("familie_profile_id", profile.id)
    .order("medikament_name");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Medikamentenplan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Alle Medikamente mit Dosierung auf einen Blick
        </p>
      </div>
      <MedikamenteClient
        medikamente={medikamente ?? []}
        isAnbieter={false}
      />
    </div>
  );
}

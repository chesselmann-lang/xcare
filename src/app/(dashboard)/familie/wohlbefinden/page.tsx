import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WohlbefindenClient from "@/components/wohlbefinden/WohlbefindenClient";

export default async function FamilieWohlbefindenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "familie") redirect("/");

  const { data: eintraege } = await supabase
    .from("wohlbefinden")
    .select("id, erfasst_am, schlaf, schmerz, stimmung, mobilitaet, appetit, notiz, erfasst_von_rolle")
    .eq("familie_profile_id", profile.id)
    .order("erfasst_am", { ascending: false })
    .limit(90);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Wohlbefinden</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tägliche Erfassung von Schlaf, Stimmung, Schmerz, Mobilität und Appetit
        </p>
      </div>
      <WohlbefindenClient
        eintraege={eintraege ?? []}
        isAnbieter={false}
      />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PflegegradClient from "@/components/pflegegrad/PflegegradClient";

export default async function FamiliePflegegradPage() {
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
    .from("pflegegrad_einschaetzungen")
    .select("id, einschaetzung_datum, aktueller_pflegegrad, pflegegrad_empfehlung, gesamtpunkte, notizen")
    .eq("familie_profile_id", profile.id)
    .order("einschaetzung_datum", { ascending: false })
    .limit(10);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pflegegrad-Einschätzung</h1>
        <p className="text-sm text-gray-500 mt-1">
          NBI-Selbsteinschätzung nach § 15 SGB XI — alle 6 Module
        </p>
      </div>
      <PflegegradClient
        eintraege={eintraege ?? []}
        isAnbieter={false}
      />
    </div>
  );
}

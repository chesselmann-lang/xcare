import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import PflegetagebuchClient from "@/components/pflegetagebuch/PflegetagebuchClient";

export const metadata: Metadata = {
  title: "Pflegetagebuch | xcare",
  description: "Tägliche Einträge mit Stimmungs-Tracker und Verlaufsansicht",
};

export default async function FamiliePflegetagebuchPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "familie") redirect("/");

  // Letzte 90 Tage laden — ausreichend für Chart + History
  const { data: eintraege } = await supabase
    .from("pflegetagebuch")
    .select("id, eintrag_datum, stimmung, schlaf_stunden, schmerzen, aktivitaeten, notizen, erstellt_von, created_at")
    .eq("profil_id", user.id)
    .order("eintrag_datum", { ascending: false })
    .limit(90);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pflegetagebuch</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tägliche Einträge mit Stimmungs-Tracker — Verlauf der letzten 90 Tage
        </p>
      </div>
      <PflegetagebuchClient eintraege={eintraege ?? []} />
    </div>
  );
}

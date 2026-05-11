import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FamilieDokuClient } from "@/components/dokumentation/FamilieDokuClient";

export const metadata: Metadata = {
  title: "Pflegedokumentation | xcare",
  description: "Einsicht in Ihre persönliche Pflegedokumentation.",
};

export default async function FamiliePflegedokuPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("user_id", user.id).single();
  if (profile?.role !== "familie") redirect("/anbieter/dokumentation");

  // Letzten 90 Tage
  const von90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: eintraege } = await supabase
    .from("pflegedokumentation")
    .select(`
      id, kategorie, titel, inhalt, ereignis_datum, created_at,
      blutdruck_sys, blutdruck_dia, puls, temperatur, gewicht, blutzucker, sauerstoff,
      medikament_name, medikament_dosis, medikament_gegeben,
      unterschrieben, unterschrift_ts,
      familie_profile_id,
      care_workers (vorname, nachname),
      profiles!pflegedokumentation_erstellt_von_fkey (vorname, nachname)
    `)
    .eq("familie_profile_id", profile.id)
    .gte("ereignis_datum", von90)
    .order("ereignis_datum", { ascending: false })
    .limit(200);

  return (
    <FamilieDokuClient
      eintraege={(eintraege ?? []) as Parameters<typeof FamilieDokuClient>[0]["eintraege"]}
    />
  );
}

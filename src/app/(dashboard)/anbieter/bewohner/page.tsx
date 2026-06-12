import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BewohnerClient } from "@/components/bewohner/BewohnerClient";
import { Users } from "lucide-react";

export const metadata = { title: "Bewohner-Stammdaten | xcare" };

export default async function BewohnerPage() {
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
    .select("id, name")
    .eq("profile_id", profile.id)
    .single();

  if (!anbieter) redirect("/anbieter/dashboard");

  const { data: bewohner } = await supabase
    .from("bewohner")
    .select("id, vorname, nachname, geburtsdatum, geschlecht, zimmer_nr, station, status, pflegegrad, aufnahmedatum, mobilitaet, kommunikation, notfallkontakt_name, notfallkontakt_telefon, created_at")
    .eq("anbieter_id", anbieter.id)
    .order("nachname")
    .order("vorname");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[--primary]/10 flex items-center justify-center shrink-0">
          <Users className="w-6 h-6 text-[--primary]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[--foreground]">Bewohner-Stammdaten</h1>
          <p className="text-sm text-[--muted-foreground] mt-1">
            Vollständige Bewohnerverwaltung für {anbieter.name}
          </p>
        </div>
      </div>
      <BewohnerClient initialBewohner={bewohner ?? []} />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TourenClient } from "@/components/touren/TourenClient";
import { Route } from "lucide-react";

export const metadata = { title: "Tourenplanung | xcare" };

export default async function TourenplanungPage() {
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

  const today = new Date().toISOString().split("T")[0];

  // Load today's and recent tours
  const { data: touren } = await supabase
    .from("touren")
    .select(`
      id, datum, name, fahrzeug, status, start_ort, end_ort, geplante_km, notizen, created_at,
      fahrer:profiles!fahrer_id(vorname, nachname),
      tour_einsaetze(id, kunde_name, kunde_adresse, geplante_ankunft, geplante_abfahrt, status, prioritaet, reihenfolge, leistungsart, leistungsminuten)
    `)
    .eq("anbieter_id", anbieter.id)
    .gte("datum", new Date(Date.now() - 14 * 86400 * 1000).toISOString().split("T")[0])
    .order("datum", { ascending: false })
    .order("name");

  // Load team for fahrer selection
  const { data: teamRaw } = await supabase
    .from("team_members")
    .select("profile_id, profiles(vorname, nachname)")
    .eq("anbieter_id", anbieter.id)
    .eq("aktiv", true);

  const team = (teamRaw ?? []).map((t) => {
    const p = t.profiles as { vorname: string | null; nachname: string | null } | null;
    return {
      profile_id: t.profile_id,
      name: p ? `${p.vorname ?? ""} ${p.nachname ?? ""}`.trim() : t.profile_id.slice(0, 8),
    };
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[--primary]/10 flex items-center justify-center shrink-0">
          <Route className="w-6 h-6 text-[--primary]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[--foreground]">Tourenplanung</h1>
          <p className="text-sm text-[--muted-foreground] mt-1">
            Ambulante Diensteinsätze planen und verfolgen — {anbieter.name}
          </p>
        </div>
      </div>
      <TourenClient
        initialTouren={touren ?? []}
        team={team}
        today={today}
      />
    </div>
  );
}

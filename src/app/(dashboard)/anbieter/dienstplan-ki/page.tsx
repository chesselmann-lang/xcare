import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DienstplanOptimizer } from "@/components/dienstplan/DienstplanOptimizer";

export const metadata = { title: "Dienstplan-Optimierer | xcare" };

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export default async function DienstplanKiPage() {
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

  // Load team members
  const { data: teamRaw } = await supabase
    .from("team_members")
    .select("profile_id, rolle, stunden_pro_woche, profiles(vorname, nachname)")
    .eq("anbieter_id", anbieter.id)
    .eq("aktiv", true);

  const team = (teamRaw ?? []).map((t) => {
    const p = t.profiles as { vorname: string | null; nachname: string | null } | null;
    return {
      profile_id: t.profile_id,
      name: p ? `${p.vorname ?? ""} ${p.nachname ?? ""}`.trim() : t.profile_id.slice(0, 8),
      qualifikation: t.rolle ?? undefined,
      wochenstunden: t.stunden_pro_woche ?? undefined,
    };
  });

  // Load recent Dienstpläne (last 4 weeks)
  const { data: vorschlaege } = await supabase
    .from("dienstplan_vorschlaege")
    .select("id, woche_start, status, optimierungsziel, ki_begruendung, created_at")
    .eq("anbieter_id", anbieter.id)
    .order("woche_start", { ascending: false })
    .limit(8);

  const currentWoche = getMondayOfWeek(new Date());

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[--foreground]">Dienstplan-Optimierer</h1>
        <p className="text-sm text-[--muted-foreground] mt-1">
          KI-gestützte Schichtplanung für {anbieter.name} — faire Besetzung auf Knopfdruck
        </p>
      </div>
      <DienstplanOptimizer
        team={team}
        vorschlaege={vorschlaege ?? []}
        currentWoche={currentWoche}
      />
    </div>
  );
}

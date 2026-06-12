import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { KapazitaetClient } from "@/components/kapazitaet/KapazitaetClient";
import { BarChart3 } from "lucide-react";

export const metadata = { title: "Kapazitätsplanung | xcare" };

export default async function KapazitaetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("id, role").eq("user_id", user.id).single();
  if (profile?.role !== "anbieter") redirect("/");

  const { data: anbieter } = await supabase
    .from("anbieter").select("id, name").eq("profile_id", profile.id).single();
  if (!anbieter) redirect("/anbieter/dashboard");

  const WEEKS = 8;

  // ── Team size ──────────────────────────────────────────────────────────────
  const { count: teamGroesse } = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("anbieter_id", anbieter.id)
    .eq("status", "aktiv");

  // ── Active Bewohner ────────────────────────────────────────────────────────
  const { count: aktivBewohner } = await supabase
    .from("bewohner")
    .select("id", { count: "exact", head: true })
    .eq("anbieter_id", anbieter.id)
    .eq("status", "aktiv");

  // ── Date range ────────────────────────────────────────────────────────────
  const since = new Date();
  since.setDate(since.getDate() - WEEKS * 7);
  const sinceStr = since.toISOString().split("T")[0];

  // ── Tours ─────────────────────────────────────────────────────────────────
  const { data: touren } = await supabase
    .from("touren")
    .select("id, datum, status, geplante_kapazitaet")
    .eq("anbieter_id", anbieter.id)
    .gte("datum", sinceStr)
    .order("datum", { ascending: true });

  const { data: einsaetze } = await supabase
    .from("tour_einsaetze")
    .select("id, tour_id, status, leistungsminuten")
    .eq("anbieter_id", anbieter.id)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  const tourIds = new Set((touren ?? []).map((t) => t.id));

  const totalTouren = (touren ?? []).length;
  const abgeschlosseneTouren = (touren ?? []).filter((t) => t.status === "abgeschlossen").length;
  const totalEinsaetze = (einsaetze ?? []).filter((e) => tourIds.has(e.tour_id)).length;
  const abgeschlosseneEinsaetze = (einsaetze ?? [])
    .filter((e) => tourIds.has(e.tour_id) && e.status === "abgeschlossen").length;
  const totalMinuten = (einsaetze ?? [])
    .filter((e) => tourIds.has(e.tour_id))
    .reduce((s, e) => s + (e.leistungsminuten ?? 0), 0);

  // ── Weekly trend ──────────────────────────────────────────────────────────
  function getWeekStart(dateStr: string): string {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split("T")[0];
  }

  const weeklyMap = new Map<string, { label: string; touren: number; einsaetze: number; minuten: number }>();
  for (let w = WEEKS - 1; w >= 0; w--) {
    const d = new Date();
    d.setDate(d.getDate() - w * 7);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    const key = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
    if (!weeklyMap.has(key)) weeklyMap.set(key, { label, touren: 0, einsaetze: 0, minuten: 0 });
  }

  const bucketKeys = [...weeklyMap.keys()].sort();
  function floorToBucket(weekStart: string): string | null {
    let best: string | null = null;
    for (const k of bucketKeys) {
      if (k <= weekStart) best = k;
      else break;
    }
    return best;
  }

  for (const tour of touren ?? []) {
    const ws = getWeekStart(tour.datum);
    const bucket = floorToBucket(ws);
    if (bucket && weeklyMap.has(bucket)) weeklyMap.get(bucket)!.touren++;
  }

  const tourDatumMap = new Map((touren ?? []).map((t) => [t.id, t.datum]));
  for (const e of einsaetze ?? []) {
    const datum = tourDatumMap.get(e.tour_id);
    if (!datum) continue;
    const ws = getWeekStart(datum);
    const bucket = floorToBucket(ws);
    if (bucket && weeklyMap.has(bucket)) {
      const b = weeklyMap.get(bucket)!;
      b.einsaetze++;
      b.minuten += e.leistungsminuten ?? 0;
    }
  }

  const wochenTrend = bucketKeys.map((k) => ({ weekStart: k, ...weeklyMap.get(k)! }));

  const team = teamGroesse ?? 0;
  const geplantKapazitaet = team * 8 * 60 * 5 * WEEKS;
  const auslastungProzent = geplantKapazitaet > 0
    ? Math.min(Math.round((totalMinuten / geplantKapazitaet) * 100), 999)
    : 0;

  const bewohner = aktivBewohner ?? 0;

  const initialData = {
    anbieter: { id: anbieter.id, name: anbieter.name },
    teamGroesse: team,
    aktivBewohner: bewohner,
    betreuungsquote: team > 0 ? Math.round((bewohner / team) * 10) / 10 : null,
    weeks: WEEKS,
    touren: {
      gesamt: totalTouren,
      abgeschlossen: abgeschlosseneTouren,
      abschlussquote: totalTouren > 0 ? Math.round((abgeschlosseneTouren / totalTouren) * 100) : 0,
    },
    einsaetze: {
      gesamt: totalEinsaetze,
      abgeschlossen: abgeschlosseneEinsaetze,
      avgProTour: totalTouren > 0 ? Math.round((totalEinsaetze / totalTouren) * 10) / 10 : 0,
      totalMinuten,
      avgMinutenProEinsatz: totalEinsaetze > 0 ? Math.round(totalMinuten / totalEinsaetze) : 0,
    },
    auslastungProzent,
    wochenTrend,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[--primary]/10 flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-[--primary]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[--foreground]">Kapazitäts- & Auslastungsplanung</h1>
          <p className="text-sm text-[--muted-foreground] mt-1">
            Übersicht über Team-Kapazität, Touren-Auslastung und Betreuungsquoten
          </p>
        </div>
      </div>
      <KapazitaetClient initialData={initialData} />
    </div>
  );
}

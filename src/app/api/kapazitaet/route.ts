import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/** GET /api/kapazitaet — capacity & utilisation aggregates for the anbieter */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("id").eq("user_id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });

    const { data: anbieter } = await supabase
      .from("anbieter").select("id, name").eq("profile_id", profile.id).single();
    if (!anbieter) return NextResponse.json({ error: "Kein Anbieter" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const weeks = Math.min(Math.max(parseInt(searchParams.get("weeks") ?? "8"), 4), 24);

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

    // ── Date range for trend ───────────────────────────────────────────────────
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);
    const sinceStr = since.toISOString().split("T")[0];

    // ── Tour stats (raw) ───────────────────────────────────────────────────────
    const { data: touren } = await supabase
      .from("touren")
      .select("id, datum, status, geplante_kapazitaet")
      .eq("anbieter_id", anbieter.id)
      .gte("datum", sinceStr)
      .order("datum", { ascending: true });

    const { data: einsaetze } = await supabase
      .from("tour_einsaetze")
      .select("id, tour_id, status, leistungsminuten, geplante_ankunft, tatsaechliche_ankunft")
      .eq("anbieter_id", anbieter.id)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });

    const tourIds = new Set((touren ?? []).map((t) => t.id));

    // ── Aggregate totals ───────────────────────────────────────────────────────
    const totalTouren = (touren ?? []).length;
    const abgeschlosseneTouren = (touren ?? []).filter((t) => t.status === "abgeschlossen").length;
    const totalEinsaetze = (einsaetze ?? []).filter((e) => tourIds.has(e.tour_id)).length;
    const abgeschlosseneEinsaetze = (einsaetze ?? []).filter(
      (e) => tourIds.has(e.tour_id) && e.status === "abgeschlossen"
    ).length;
    const totalMinuten = (einsaetze ?? [])
      .filter((e) => tourIds.has(e.tour_id))
      .reduce((s, e) => s + (e.leistungsminuten ?? 0), 0);

    // avg einsaetze per tour
    const avgEinsaetzeProTour = totalTouren > 0 ? Math.round((totalEinsaetze / totalTouren) * 10) / 10 : 0;
    const avgMinutenProEinsatz = totalEinsaetze > 0 ? Math.round(totalMinuten / totalEinsaetze) : 0;

    // ── Weekly trend ───────────────────────────────────────────────────────────
    const weeklyMap = new Map<string, { label: string; touren: number; einsaetze: number; minuten: number }>();

    // Build week buckets
    for (let w = weeks - 1; w >= 0; w--) {
      const d = new Date();
      d.setDate(d.getDate() - w * 7);
      // ISO week start (Monday)
      const day = d.getDay();
      const diff = (day === 0 ? -6 : 1 - day);
      d.setDate(d.getDate() + diff);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
      if (!weeklyMap.has(key)) {
        weeklyMap.set(key, { label, touren: 0, einsaetze: 0, minuten: 0 });
      }
    }

    const bucketKeys = [...weeklyMap.keys()].sort();

    function getWeekStart(dateStr: string): string {
      const d = new Date(dateStr);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      return d.toISOString().split("T")[0];
    }

    function floorToBucket(weekStart: string): string | null {
      // Find the last bucket key <= weekStart
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
      if (bucket && weeklyMap.has(bucket)) {
        weeklyMap.get(bucket)!.touren++;
      }
    }

    // For einsaetze, use tour datum via tour_id lookup
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

    // ── Utilisation % based on team capacity ───────────────────────────────────
    // Rough model: each team member can handle ~8h/day × 5 days/week
    const team = teamGroesse ?? 0;
    const geplantMinutenKapazitaet = team * 8 * 60 * 5 * weeks; // total across period
    const auslastungProzent = geplantMinutenKapazitaet > 0
      ? Math.min(Math.round((totalMinuten / geplantMinutenKapazitaet) * 100), 999)
      : 0;

    return NextResponse.json({
      anbieter: { id: anbieter.id, name: anbieter.name },
      teamGroesse: team,
      aktivBewohner: aktivBewohner ?? 0,
      betreuungsquote: team > 0 ? Math.round(((aktivBewohner ?? 0) / team) * 10) / 10 : null,
      weeks,
      touren: {
        gesamt: totalTouren,
        abgeschlossen: abgeschlosseneTouren,
        abschlussquote: totalTouren > 0 ? Math.round((abgeschlosseneTouren / totalTouren) * 100) : 0,
      },
      einsaetze: {
        gesamt: totalEinsaetze,
        abgeschlossen: abgeschlosseneEinsaetze,
        avgProTour: avgEinsaetzeProTour,
        totalMinuten,
        avgMinutenProEinsatz,
      },
      auslastungProzent,
      wochenTrend,
    });
  } catch (err) {
    logger.error("GET /api/kapazitaet error", { error: String(err) });
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

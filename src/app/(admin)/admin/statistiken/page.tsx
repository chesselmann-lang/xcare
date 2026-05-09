import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Users, Building2, FileText, Star, TrendingUp,
  ShieldCheck, Clock, CheckCircle2, AlertCircle, LayoutList
} from "lucide-react";
import { LEISTUNGSKATEGORIEN } from "@/lib/constants";
import type { LeistungsKategorie } from "@/lib/types";

type MonthBucket = { month: string; nutzer: number; anbieter: number; anfragen: number };

function getLast6MonthKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function bucketByMonth(rows: { created_at: string }[]): Record<string, number> {
  const result: Record<string, number> = {};
  rows.forEach((r) => {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    result[key] = (result[key] ?? 0) + 1;
  });
  return result;
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mär", "04": "Apr", "05": "Mai", "06": "Jun",
  "07": "Jul", "08": "Aug", "09": "Sep", "10": "Okt", "11": "Nov", "12": "Dez",
};

export default async function AdminStatistikenPage() {
  const supabase = await createClient();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsAgoISO = sixMonthsAgo.toISOString();

  // Totals
  const [
    { count: totalNutzer },
    { count: totalAnbieter },
    { count: totalAktiveAnbieter },
    { count: totalAnfragen },
    { count: totalBewertungen },
    { count: verifizierungQueue },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("anbieter").select("*", { count: "exact", head: true }),
    supabase.from("anbieter").select("*", { count: "exact", head: true }).eq("aktiv", true),
    supabase.from("anfragen").select("*", { count: "exact", head: true }),
    supabase.from("bewertungen").select("*", { count: "exact", head: true }),
    supabase.from("anbieter").select("*", { count: "exact", head: true })
      .eq("aktiv", true).eq("verifiziert", false),
  ]);

  // Monthly growth data (last 6 months)
  const [
    { data: newNutzer },
    { data: newAnbieter },
    { data: newAnfragen },
  ] = await Promise.all([
    supabase.from("profiles").select("created_at").gte("created_at", sixMonthsAgoISO),
    supabase.from("anbieter").select("created_at").gte("created_at", sixMonthsAgoISO),
    supabase.from("anfragen").select("created_at").gte("created_at", sixMonthsAgoISO),
  ]);

  const monthKeys = getLast6MonthKeys();
  const nutzerByMonth = bucketByMonth(newNutzer ?? []);
  const anbieterByMonth = bucketByMonth(newAnbieter ?? []);
  const anfragenByMonth = bucketByMonth(newAnfragen ?? []);

  const growthData: MonthBucket[] = monthKeys.map((key) => ({
    month: key,
    nutzer: nutzerByMonth[key] ?? 0,
    anbieter: anbieterByMonth[key] ?? 0,
    anfragen: anfragenByMonth[key] ?? 0,
  }));

  const maxGrowth = Math.max(...growthData.map((d) => Math.max(d.nutzer, d.anbieter, d.anfragen)), 1);

  // Top anbieter by anfragen
  const { data: topAnbieterRaw } = await supabase
    .from("anfragen")
    .select("anbieter_id");

  const anfragenPerAnbieter: Record<string, number> = {};
  (topAnbieterRaw ?? []).forEach((a) => {
    if (a.anbieter_id) anfragenPerAnbieter[a.anbieter_id] = (anfragenPerAnbieter[a.anbieter_id] ?? 0) + 1;
  });

  const top5Ids = Object.entries(anfragenPerAnbieter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const { data: topAnbieter } = top5Ids.length > 0
    ? await supabase.from("anbieter").select("id, name, ort, verifiziert").in("id", top5Ids)
    : { data: [] };

  const topAnbieterSorted = (topAnbieter ?? []).sort(
    (a, b) => (anfragenPerAnbieter[b.id] ?? 0) - (anfragenPerAnbieter[a.id] ?? 0)
  );

  // Verification queue (unverified, active, newest first)
  const { data: verifQueue } = await supabase
    .from("anbieter")
    .select("id, name, ort, created_at")
    .eq("aktiv", true)
    .eq("verifiziert", false)
    .order("created_at", { ascending: false })
    .limit(5);

  // Conversion: bestaetigt + abgeschlossen / total anfragen
  const { count: bestaetigtCount } = await supabase
    .from("anfragen").select("*", { count: "exact", head: true })
    .in("status", ["bestaetigt", "abgeschlossen"]);

  const conversionRate = (totalAnfragen ?? 0) > 0
    ? Math.round(((bestaetigtCount ?? 0) / (totalAnfragen ?? 1)) * 100)
    : 0;

  // Avg bewertung
  const { data: allBew } = await supabase.from("bewertungen").select("sterne");
  const avgBew = (allBew?.length ?? 0) > 0
    ? (allBew!.reduce((s, b) => s + b.sterne, 0) / allBew!.length).toFixed(1)
    : "–";

  // Leistungskategorien breakdown
  const { data: leistungenRaw } = await supabase.from("leistungen").select("kategorie");
  const katCount: Record<string, number> = {};
  (leistungenRaw ?? []).forEach((l) => {
    if (l.kategorie) katCount[l.kategorie] = (katCount[l.kategorie] ?? 0) + 1;
  });
  const topKategorien = Object.entries(katCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([kat, count]) => ({
      kat: kat as LeistungsKategorie,
      label: LEISTUNGSKATEGORIEN[kat as LeistungsKategorie] ?? kat,
      count,
    }));
  const maxKat = topKategorien[0]?.count ?? 1;

  // Anfragen by status
  const { data: anfragenStatusRaw } = await supabase.from("anfragen").select("status");
  const statusCount: Record<string, number> = {};
  (anfragenStatusRaw ?? []).forEach((a) => {
    statusCount[a.status] = (statusCount[a.status] ?? 0) + 1;
  });
  const statusBreakdown = [
    { status: "offen", label: "Offen", color: "bg-amber-400" },
    { status: "in_bearbeitung", label: "In Bearbeitung", color: "bg-blue-400" },
    { status: "angeboten", label: "Angebot", color: "bg-indigo-400" },
    { status: "bestaetigt", label: "Bestätigt", color: "bg-emerald-400" },
    { status: "abgelehnt", label: "Abgelehnt", color: "bg-red-400" },
    { status: "abgeschlossen", label: "Abgeschlossen", color: "bg-gray-400" },
  ].map((s) => ({ ...s, count: statusCount[s.status] ?? 0 }));

  const kpis = [
    { label: "Nutzer", value: totalNutzer ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Anbieter aktiv", value: totalAktiveAnbieter ?? 0, sub: `${totalAnbieter ?? 0} gesamt`, icon: Building2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Anfragen", value: totalAnfragen ?? 0, sub: `${conversionRate}% Konversion`, icon: FileText, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Bewertungen", value: totalBewertungen ?? 0, sub: `Ø ${avgBew} Sterne`, icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Plattform-Statistiken</h1>
        <p className="text-gray-500 text-sm mt-0.5">Gesamtübersicht der xcare Plattform</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className={`inline-flex p-2.5 rounded-xl ${kpi.bg} mb-3`}>
                <Icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpi.value.toLocaleString("de-DE")}</p>
              <p className="text-sm text-gray-500 mt-0.5">{kpi.label}</p>
              {kpi.sub && <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Monthly Growth Chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" /> Monatliches Wachstum (letzte 6 Monate)
          </h2>
          <div className="grid grid-cols-6 gap-2">
            {growthData.map((d) => {
              const [year, mon] = d.month.split("-");
              const label = `${MONTH_LABELS[mon] ?? mon} ${year.slice(2)}`;
              return (
                <div key={d.month} className="text-center">
                  {/* Stacked mini bars */}
                  <div className="flex items-end justify-center gap-0.5 h-20 mb-1">
                    {[
                      { val: d.nutzer, cls: "bg-blue-400" },
                      { val: d.anbieter, cls: "bg-emerald-400" },
                      { val: d.anfragen, cls: "bg-purple-400" },
                    ].map(({ val, cls }, i) => (
                      <div
                        key={i}
                        className={`w-3.5 rounded-t ${cls} transition-all`}
                        style={{ height: `${Math.max((val / maxGrowth) * 72, val > 0 ? 4 : 0)}px` }}
                        title={`${val}`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400">{label}</p>
                  <p className="text-[9px] text-gray-300 mt-0.5">{d.nutzer}/{d.anbieter}/{d.anfragen}</p>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-blue-400 inline-block" />Nutzer</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400 inline-block" />Anbieter</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-purple-400 inline-block" />Anfragen</span>
          </div>
        </div>

        {/* Top Anbieter */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-500" /> Top Anbieter nach Anfragen
          </h2>
          {topAnbieterSorted.length === 0 ? (
            <p className="text-sm text-gray-400">Noch keine Anfragen vorhanden</p>
          ) : (
            <div className="space-y-3">
              {topAnbieterSorted.map((a, idx) => {
                const count = anfragenPerAnbieter[a.id] ?? 0;
                const max = anfragenPerAnbieter[topAnbieterSorted[0].id] ?? 1;
                return (
                  <div key={a.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-gray-300 w-4 shrink-0">#{idx + 1}</span>
                        <Link href={`/admin/anbieter/${a.id}`} className="text-sm font-medium text-gray-800 hover:text-blue-600 truncate">
                          {a.name}
                        </Link>
                        {a.verifiziert && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                      </div>
                      <span className="text-sm font-semibold text-gray-700 shrink-0 ml-2">{count}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                      {a.ort && <span className="text-[10px] text-gray-300 shrink-0">{a.ort}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Verification Queue */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-500" /> Verifizierungs-Queue
            </span>
            {(verifizierungQueue ?? 0) > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                {verifizierungQueue} ausstehend
              </span>
            )}
          </h2>
          {(verifQueue?.length ?? 0) === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Alle Anbieter sind verifiziert
            </div>
          ) : (
            <div className="space-y-2">
              {verifQueue!.map((a) => (
                <Link
                  key={a.id}
                  href={`/admin/anbieter/${a.id}`}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{a.name}</p>
                    {a.ort && <p className="text-xs text-gray-400">{a.ort}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Ausstehend
                    </span>
                  </div>
                </Link>
              ))}
              {(verifizierungQueue ?? 0) > 5 && (
                <Link href="/admin/anbieter" className="block text-xs text-blue-600 hover:underline text-right pt-1">
                  + {(verifizierungQueue ?? 0) - 5} weitere →
                </Link>
              )}
            </div>
          )}

          {/* Platform health */}
          <div className="mt-5 pt-4 border-t border-gray-50 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-gray-800">{conversionRate}%</p>
              <p className="text-xs text-gray-400 mt-0.5">Konversionsrate</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <p className="text-xl font-bold text-gray-800">{avgBew}</p>
                {avgBew !== "–" && <Star className="h-4 w-4 text-amber-400 fill-amber-400" />}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Ø Bewertung</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: Leistungskategorien + Anfragen-Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Leistungskategorien */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <LayoutList className="h-4 w-4 text-purple-500" /> Top Leistungskategorien
          </h2>
          {topKategorien.length === 0 ? (
            <p className="text-sm text-gray-400">Noch keine Leistungen angelegt.</p>
          ) : (
            <div className="space-y-3">
              {topKategorien.map(({ kat, label, count }) => (
                <div key={kat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 truncate">{label}</span>
                    <span className="text-sm font-semibold text-gray-800 ml-2 shrink-0">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400 rounded-full transition-all"
                      style={{ width: `${(count / maxKat) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Anfragen Status-Breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" /> Anfragen nach Status
          </h2>
          {(totalAnfragen ?? 0) === 0 ? (
            <p className="text-sm text-gray-400">Noch keine Anfragen vorhanden.</p>
          ) : (
            <div className="space-y-3">
              {statusBreakdown.filter((s) => s.count > 0).map((s) => {
                const pct = Math.round((s.count / (totalAnfragen ?? 1)) * 100);
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">{s.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{pct}%</span>
                        <span className="text-sm font-semibold text-gray-800">{s.count}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${s.color} rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <Link
                href="/admin/anfragen"
                className="block text-xs text-blue-500 hover:underline text-right pt-1"
              >
                Alle Anfragen ansehen →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Clock className="h-3.5 w-3.5" />
        Echtzeit-Daten aus Supabase ·
        <Link href="/admin/analytics" className="text-blue-500 hover:underline">Detaillierte Analytics →</Link>
      </div>
    </div>
  );
}

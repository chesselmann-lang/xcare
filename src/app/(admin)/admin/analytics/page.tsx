import { createClient } from "@/lib/supabase/server";
import { BarChart3, TrendingUp, Clock } from "lucide-react";

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();

  // Anfragen by status
  const { data: anfragenByStatus } = await supabase
    .from("anfragen")
    .select("status");

  // Anfragen by Lebenslage
  const { data: anfragenByLebenslage } = await supabase
    .from("anfragen")
    .select("lebenslage");

  // Anfragen last 30 days by day (simplified: count per day)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentAnfragen } = await supabase
    .from("anfragen")
    .select("created_at")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  // Compute stats
  const statusCounts = (anfragenByStatus ?? []).reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  const lebenslageCount = (anfragenByLebenslage ?? []).reduce<Record<string, number>>((acc, a) => {
    acc[a.lebenslage] = (acc[a.lebenslage] ?? 0) + 1;
    return acc;
  }, {});

  const sortedLebenslagen = Object.entries(lebenslageCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const totalAnfragen = anfragenByStatus?.length ?? 0;

  const statusConfig: Record<string, { label: string; color: string }> = {
    offen: { label: "Offen", color: "bg-yellow-400" },
    in_bearbeitung: { label: "In Bearbeitung", color: "bg-blue-400" },
    angeboten: { label: "Angeboten", color: "bg-purple-400" },
    bestaetigt: { label: "Bestätigt", color: "bg-green-400" },
    abgelehnt: { label: "Abgelehnt", color: "bg-red-400" },
    abgeschlossen: { label: "Abgeschlossen", color: "bg-gray-300" },
  };

  // Group recent by day
  const byDay = (recentAnfragen ?? []).reduce<Record<string, number>>((acc, a) => {
    const day = new Date(a.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {});

  const maxPerDay = Math.max(...Object.values(byDay), 1);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-0.5">Plattform-Metriken im Überblick</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Anfragen nach Status */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Anfragen nach Status
          </h2>
          <div className="space-y-3">
            {Object.entries(statusConfig).map(([status, config]) => {
              const count = statusCounts[status] ?? 0;
              const pct = totalAnfragen > 0 ? (count / totalAnfragen) * 100 : 0;
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{config.label}</span>
                    <span className="font-medium text-gray-800">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${config.color} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-gray-400 pt-1">Gesamt: {totalAnfragen} Anfragen</p>
          </div>
        </div>

        {/* Top Lebenslagen */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Top Lebenslagen
          </h2>
          <div className="space-y-3">
            {sortedLebenslagen.length === 0 && (
              <p className="text-sm text-gray-400">Noch keine Daten</p>
            )}
            {sortedLebenslagen.map(([lebenslage, count]) => {
              const pct = totalAnfragen > 0 ? (count / totalAnfragen) * 100 : 0;
              return (
                <div key={lebenslage}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 capitalize">{lebenslage.replace(/_/g, " ")}</span>
                    <span className="font-medium text-gray-800">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Verlauf letzte 30 Tage */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Anfragen letzte 30 Tage
          </h2>
          {Object.keys(byDay).length === 0 ? (
            <p className="text-sm text-gray-400">Keine Anfragen im Zeitraum</p>
          ) : (
            <div className="flex items-end gap-1 h-24">
              {Object.entries(byDay).map(([day, count]) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-blue-400 rounded-sm transition-all hover:bg-blue-500"
                    style={{ height: `${(count / maxPerDay) * 80}px`, minHeight: "4px" }}
                    title={`${day}: ${count} Anfragen`}
                  />
                  <span className="text-[9px] text-gray-300 hidden lg:block">{day}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BarChart3, TrendingUp, TrendingDown, Minus, Star,
  Users, CheckCircle2, Clock, ArrowLeft, MessageSquare,
  Heart, Award, Activity
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SterneDisplay } from "@/components/bewertungen/SterneRating";
import type { AnfrageStatus } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function MonthLabel(isoDate: string) {
  const d = new Date(isoDate);
  return d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
}

function trendIcon(diff: number) {
  if (diff > 0) return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
  if (diff < 0) return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-gray-400" />;
}

function trendColor(diff: number) {
  if (diff > 0) return "text-green-600";
  if (diff < 0) return "text-red-600";
  return "text-gray-500";
}

const statusColors: Record<AnfrageStatus, string> = {
  offen: "bg-yellow-100 text-yellow-800",
  in_bearbeitung: "bg-blue-100 text-blue-800",
  angeboten: "bg-indigo-100 text-indigo-800",
  bestaetigt: "bg-green-100 text-green-800",
  abgelehnt: "bg-red-100 text-red-800",
  abgeschlossen: "bg-gray-100 text-gray-700",
};
const statusLabel: Record<AnfrageStatus, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  angeboten: "Angeboten",
  bestaetigt: "Bestätigt",
  abgelehnt: "Abgelehnt",
  abgeschlossen: "Abgeschlossen",
};

const lebenslagenLabel: Record<string, string> = {
  geburt_fruehe_kindheit: "Geburt & Kindheit",
  schulkind_jugend: "Schulkind & Jugend",
  eingliederung_behinderung: "Eingliederung",
  erwerbsleben_vereinbarkeit: "Vereinbarkeit",
  krankheit_genesung: "Krankheit & Genesung",
  alter_pflege: "Alter & Pflege",
  hospiz_palliativ: "Hospiz & Palliativ",
  trauer_nachlass: "Trauer & Nachlass",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function StatistikenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "anbieter") redirect("/familie");

  const { data: anbieter } = await supabase
    .from("anbieter")
    .select("id, name, verifiziert, created_at")
    .eq("profile_id", profile.id)
    .single();

  if (!anbieter) redirect("/anbieter");

  // ── Load all anfragen ────────────────────────────────────────────────────
  const [
    { data: alleAnfragen },
    { data: alleBewertungen },
    { data: alleNachrichten },
  ] = await Promise.all([
    supabase
      .from("anfragen")
      .select("id, status, lebenslage, created_at, updated_at")
      .eq("anbieter_id", anbieter.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("bewertungen")
      .select("id, sterne, kommentar, created_at")
      .eq("anbieter_id", anbieter.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("nachrichten")
      .select("id, created_at, anfrage_id")
      .eq("sender_id", profile.id),
  ]);

  const anfragen = alleAnfragen ?? [];
  const bewertungen = alleBewertungen ?? [];

  // ── Overall KPIs ─────────────────────────────────────────────────────────
  const total = anfragen.length;
  const abgeschlossen = anfragen.filter((a) => a.status === "abgeschlossen").length;
  const offen = anfragen.filter((a) => ["offen", "in_bearbeitung", "angeboten"].includes(a.status)).length;
  const abgelehnt = anfragen.filter((a) => a.status === "abgelehnt").length;
  const abschlussRate = total > 0 ? Math.round((abgeschlossen / total) * 100) : 0;
  const ablehnRate = total > 0 ? Math.round((abgelehnt / total) * 100) : 0;

  const avgSterne = bewertungen.length > 0
    ? bewertungen.reduce((s, b) => s + b.sterne, 0) / bewertungen.length
    : 0;

  // ── Monthly trend (last 6 months) ────────────────────────────────────────
  const now = new Date();
  const months: { label: string; start: Date; end: Date }[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    return {
      label: d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" }),
      start: d,
      end,
    };
  });

  const monthlyData = months.map((m) => {
    const inMonth = anfragen.filter((a) => {
      const d = new Date(a.created_at);
      return d >= m.start && d <= m.end;
    });
    const abgeschl = inMonth.filter((a) => a.status === "abgeschlossen").length;
    return {
      label: m.label,
      total: inMonth.length,
      abgeschlossen: abgeschl,
      rate: inMonth.length > 0 ? Math.round((abgeschl / inMonth.length) * 100) : 0,
    };
  });

  const thisMonth = monthlyData[5];
  const lastMonth = monthlyData[4];
  const monthTrend = thisMonth.total - lastMonth.total;

  // ── Lebenslage distribution ───────────────────────────────────────────────
  const llCounts: Record<string, number> = {};
  anfragen.forEach((a) => {
    llCounts[a.lebenslage] = (llCounts[a.lebenslage] ?? 0) + 1;
  });
  const llSorted = Object.entries(llCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // ── Status distribution ───────────────────────────────────────────────────
  const statusCounts: Partial<Record<AnfrageStatus, number>> = {};
  anfragen.forEach((a) => {
    statusCounts[a.status as AnfrageStatus] = (statusCounts[a.status as AnfrageStatus] ?? 0) + 1;
  });

  // ── Bewertungs-Breakdown ──────────────────────────────────────────────────
  const sterneCounts = [5, 4, 3, 2, 1].map((s) => ({
    sterne: s,
    count: bewertungen.filter((b) => b.sterne === s).length,
  }));

  // ── Response time (avg days from created to first status change from "offen") ──
  const respondedAnfragen = anfragen.filter(
    (a) => a.status !== "offen" && a.updated_at && a.created_at
  );
  const avgResponseDays = respondedAnfragen.length > 0
    ? Math.round(
        respondedAnfragen.reduce((sum, a) => {
          const diff = new Date(a.updated_at).getTime() - new Date(a.created_at).getTime();
          return sum + diff / (1000 * 60 * 60 * 24);
        }, 0) / respondedAnfragen.length
      )
    : null;

  // ── Bar chart max ─────────────────────────────────────────────────────────
  const maxMonthly = Math.max(...monthlyData.map((m) => m.total), 1);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link href="/anbieter">
          <Button variant="ghost" size="sm" className="gap-1 mb-4 -ml-2 text-[--muted-foreground]">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[--primary-light] text-[--primary]">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Statistiken</h1>
            <p className="text-sm text-[--muted-foreground]">{anbieter.name}</p>
          </div>
          {anbieter.verifiziert && (
            <Badge variant="success" className="ml-auto gap-1">
              <CheckCircle2 className="h-3 w-3" /> Verifiziert
            </Badge>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Anfragen gesamt",
            value: total,
            icon: Users,
            color: "bg-blue-50 text-blue-600",
            sub: `${offen} aktiv`,
          },
          {
            label: "Abschlussrate",
            value: `${abschlussRate}%`,
            icon: CheckCircle2,
            color: "bg-green-50 text-green-600",
            sub: `${abgeschlossen} abgeschlossen`,
          },
          {
            label: "Bewertungen",
            value: bewertungen.length,
            icon: Star,
            color: "bg-amber-50 text-amber-600",
            sub: avgSterne > 0 ? `Ø ${avgSterne.toFixed(1)} ★` : "Noch keine",
          },
          {
            label: "Ø Reaktionszeit",
            value: avgResponseDays !== null ? `${avgResponseDays}d` : "—",
            icon: Clock,
            color: "bg-purple-50 text-purple-600",
            sub: avgResponseDays !== null
              ? avgResponseDays <= 1 ? "Sehr schnell" : avgResponseDays <= 3 ? "Gut" : "Verbesserbar"
              : "Noch keine Daten",
          },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg mb-3 ${kpi.color}`}>
                <kpi.icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs font-medium text-[--foreground] mt-0.5">{kpi.label}</p>
              <p className="text-xs text-[--muted-foreground] mt-0.5">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Monthly Bar Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" /> Anfragen pro Monat
              </CardTitle>
              <div className="flex items-center gap-1.5 text-xs text-[--muted-foreground]">
                {trendIcon(monthTrend)}
                <span className={trendColor(monthTrend)}>
                  {monthTrend > 0 ? "+" : ""}{monthTrend} ggü. Vormonat
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 h-40">
                {monthlyData.map((m) => (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-[--muted-foreground] font-medium">
                      {m.total > 0 ? m.total : ""}
                    </span>
                    <div className="w-full flex flex-col justify-end" style={{ height: "120px" }}>
                      {m.total > 0 ? (
                        <div
                          className="w-full rounded-t-md bg-[--primary] transition-all relative overflow-hidden"
                          style={{ height: `${Math.max((m.total / maxMonthly) * 100, 8)}%` }}
                        >
                          {m.abgeschlossen > 0 && (
                            <div
                              className="absolute bottom-0 left-0 right-0 bg-green-500 opacity-60 rounded-t-md"
                              style={{ height: `${(m.abgeschlossen / m.total) * 100}%` }}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="w-full rounded-t-md bg-[--border]" style={{ height: "4px" }} />
                      )}
                    </div>
                    <span className="text-[10px] text-[--muted-foreground]">{m.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-[--muted-foreground]">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[--primary]" /> Anfragen
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500 opacity-60" /> Abgeschlossen
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bewertungs-Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" /> Bewertungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bewertungen.length > 0 ? (
              <>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-bold">{avgSterne.toFixed(1)}</span>
                  <div>
                    <SterneDisplay average={avgSterne} count={bewertungen.length} size="sm" />
                  </div>
                </div>
                <div className="space-y-2">
                  {sterneCounts.map(({ sterne, count }) => (
                    <div key={sterne} className="flex items-center gap-2">
                      <span className="text-xs w-4 text-right">{sterne}</span>
                      <Star className="h-3 w-3 text-amber-400 shrink-0" />
                      <div className="flex-1 h-2 bg-[--border] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{
                            width: bewertungen.length > 0
                              ? `${(count / bewertungen.length) * 100}%`
                              : "0%"
                          }}
                        />
                      </div>
                      <span className="text-xs text-[--muted-foreground] w-4">{count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-[--muted-foreground]">
                <Star className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Noch keine Bewertungen</p>
                <p className="text-xs mt-1">Bewertungen erscheinen nach abgeschlossenen Anfragen</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Lebenslage Verteilung */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-400" /> Lebenslagen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {llSorted.length > 0 ? (
              <div className="space-y-3">
                {llSorted.map(([ll, count]) => (
                  <div key={ll} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium truncate">
                          {lebenslagenLabel[ll] ?? ll.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-[--muted-foreground] shrink-0 ml-2">
                          {count}
                        </span>
                      </div>
                      <div className="h-2 bg-[--border] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[--primary] rounded-full"
                          style={{ width: `${(count / (llSorted[0][1] || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[--muted-foreground] text-center py-8">Noch keine Anfragen</p>
            )}
          </CardContent>
        </Card>

        {/* Status Verteilung */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Status-Übersicht
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(statusCounts).length > 0 ? (
              <div className="space-y-2">
                {(Object.entries(statusCounts) as [AnfrageStatus, number][])
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between p-2.5 rounded-lg bg-[--muted]">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] ?? "bg-gray-100 text-gray-700"}`}>
                        {statusLabel[status] ?? status}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-[--border] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[--primary] opacity-70 rounded-full"
                            style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-6 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                <div className="pt-1 border-t border-[--border] flex justify-between items-center">
                  <span className="text-xs text-[--muted-foreground]">Abschlussrate</span>
                  <span className={`text-sm font-bold ${abschlussRate >= 50 ? "text-green-600" : abschlussRate >= 25 ? "text-amber-600" : "text-red-600"}`}>
                    {abschlussRate}%
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[--muted-foreground] text-center py-8">Noch keine Anfragen</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monatstabelle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" /> Monatstabelle (letzte 6 Monate)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[--border]">
                  {["Monat", "Anfragen", "Abgeschlossen", "Rate", "Trend"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-[--muted-foreground] pb-2 pr-4 last:pr-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border]">
                {[...monthlyData].reverse().map((m, i) => {
                  const prev = monthlyData[5 - i - 1];
                  const diff = prev !== undefined ? m.total - prev.total : 0;
                  return (
                    <tr key={m.label} className={i === 0 ? "font-semibold" : ""}>
                      <td className="py-2.5 pr-4 text-sm">{m.label}</td>
                      <td className="py-2.5 pr-4">{m.total}</td>
                      <td className="py-2.5 pr-4">{m.abgeschlossen}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`font-medium ${m.rate >= 50 ? "text-green-600" : m.rate >= 25 ? "text-amber-600" : m.total > 0 ? "text-red-600" : "text-[--muted-foreground]"}`}>
                          {m.total > 0 ? `${m.rate}%` : "—"}
                        </span>
                      </td>
                      <td className="py-2.5">
                        {prev !== undefined ? (
                          <span className={`flex items-center gap-1 text-xs ${trendColor(diff)}`}>
                            {trendIcon(diff)}
                            {diff !== 0 ? `${diff > 0 ? "+" : ""}${diff}` : "="}
                          </span>
                        ) : (
                          <span className="text-xs text-[--muted-foreground]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BarChart3, TrendingUp, TrendingDown, Minus, Star,
  Users, CheckCircle2, Clock, ArrowLeft, MessageSquare,
  Heart, Award, Activity, Eye
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
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [
    { data: alleAnfragen },
    { data: alleBewertungen },
    { data: alleNachrichten },
    { data: profilAufrufe },
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
    supabase
      .from("anbieter_profil_aufrufe")
      .select("created_at")
      .eq("anbieter_id", anbieter.id)
      .gte("created_at", since30d)
      .order("created_at", { ascending: true }),
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

  // ── Profil-Aufrufe (last 30 days, grouped by day) ─────────────────────────
  const aufrufe = profilAufrufe ?? [];
  const aufrufeByDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    aufrufeByDay[d.toISOString().slice(0, 10)] = 0;
  }
  aufrufe.forEach((a) => {
    const day = a.created_at.slice(0, 10);
    if (day in aufrufeByDay) aufrufeByDay[day] = (aufrufeByDay[day] ?? 0) + 1;
  });
  const aufrufeData = Object.entries(aufrufeByDay).map(([date, count]) => ({ date, count }));
  const totalAufrufe30d = aufrufe.length;
  const aufrufeMax = Math.max(...aufrufeData.map((d) => d.count), 1);

  // Compare this-week vs last-week
  const nowTs = Date.now();
  const aufrufeThisWeek = aufrufe.filter((a) => new Date(a.created_at).getTime() >= nowTs - 7 * 24 * 60 * 60 * 1000).length;
  const aufrufeLastWeek = aufrufe.filter((a) => {
    const ts = new Date(a.created_at).getTime();
    return ts >= nowTs - 14 * 24 * 60 * 60 * 1000 && ts < nowTs - 7 * 24 * 60 * 60 * 1000;
  }).length;
  const aufrufeTrend = aufrufeThisWeek - aufrufeLastWeek;

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

      {/* Profilaufrufe – 30-day sparkline */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-indigo-500" /> Profilaufrufe (letzte 30 Tage)
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold">{totalAufrufe30d}</p>
                <p className="text-xs text-[--muted-foreground]">Aufrufe gesamt</p>
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                aufrufeTrend > 0 ? "bg-green-50 text-green-700" :
                aufrufeTrend < 0 ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"
              }`}>
                {aufrufeTrend > 0 ? <TrendingUp className="h-3 w-3" /> :
                 aufrufeTrend < 0 ? <TrendingDown className="h-3 w-3" /> :
                 <Minus className="h-3 w-3" />}
                {aufrufeTrend > 0 ? `+${aufrufeTrend}` : aufrufeTrend} vs. Vorwoche
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {totalAufrufe30d === 0 ? (
            <p className="text-sm text-[--muted-foreground] text-center py-6">
              Noch keine Profilaufrufe erfasst. Daten werden ab sofort gesammelt.
            </p>
          ) : (
            <>
              {/* Daily bar sparkline */}
              <div className="flex items-end gap-px h-20 mb-2">
                {aufrufeData.map((d) => (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col justify-end group relative"
                    title={`${d.date}: ${d.count} Aufrufe`}
                  >
                    <div
                      className="w-full bg-indigo-400 hover:bg-indigo-600 rounded-t-sm transition-colors"
                      style={{ height: `${Math.max((d.count / aufrufeMax) * 100, d.count > 0 ? 8 : 2)}%` }}
                    />
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                      <div className="bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap">
                        {d.count}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Date labels — first, middle, last */}
              <div className="flex justify-between text-[10px] text-[--muted-foreground] mt-1">
                <span>{new Date(aufrufeData[0]?.date ?? "").toLocaleDateString("de-DE", { day: "numeric", month: "short" })}</span>
                <span>{new Date(aufrufeData[14]?.date ?? "").toLocaleDateString("de-DE", { day: "numeric", month: "short" })}</span>
                <span>{new Date(aufrufeData[aufrufeData.length - 1]?.date ?? "").toLocaleDateString("de-DE", { day: "numeric", month: "short" })}</span>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[--border] text-sm">
                <div>
                  <span className="text-[--muted-foreground]">Diese Woche: </span>
                  <span className="font-semibold">{aufrufeThisWeek}</span>
                </div>
                <div>
                  <span className="text-[--muted-foreground]">Letzte Woche: </span>
                  <span className="font-semibold">{aufrufeLastWeek}</span>
                </div>
                <div className="ml-auto text-xs text-[--muted-foreground]">
                  Zählt echte Profilbesuche von Familien & Gästen
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
                          {lebe
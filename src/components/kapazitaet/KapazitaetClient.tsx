"use client";

import { useState } from "react";
import {
  Users, Activity, TrendingUp, Clock, BarChart3,
  CheckCircle, AlertCircle, Zap, Home, RefreshCw
} from "lucide-react";

type WochenTrend = {
  weekStart: string;
  label: string;
  touren: number;
  einsaetze: number;
  minuten: number;
};

type KapazitaetData = {
  anbieter: { id: string; name: string };
  teamGroesse: number;
  aktivBewohner: number;
  betreuungsquote: number | null;
  weeks: number;
  touren: {
    gesamt: number;
    abgeschlossen: number;
    abschlussquote: number;
  };
  einsaetze: {
    gesamt: number;
    abgeschlossen: number;
    avgProTour: number;
    totalMinuten: number;
    avgMinutenProEinsatz: number;
  };
  auslastungProzent: number;
  wochenTrend: WochenTrend[];
};

type Props = {
  initialData: KapazitaetData;
};

function formatStunden(minuten: number): string {
  const h = Math.floor(minuten / 60);
  const m = minuten % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function AuslastungsAmpel({ pct }: { pct: number }) {
  if (pct < 60) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium">
      <span className="w-2 h-2 rounded-full bg-green-500" />
      Gut ausgelastet
    </span>
  );
  if (pct < 85) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm font-medium">
      <span className="w-2 h-2 rounded-full bg-yellow-500" />
      Mittlere Auslastung
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium">
      <span className="w-2 h-2 rounded-full bg-red-500" />
      Hohe Auslastung
    </span>
  );
}

function WochenChart({ trend }: { trend: WochenTrend[] }) {
  const maxMinuten = Math.max(...trend.map((w) => w.minuten), 1);
  const maxEinsaetze = Math.max(...trend.map((w) => w.einsaetze), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2 h-48 pt-2">
        {trend.map((w) => {
          const heightPct = Math.round((w.minuten / maxMinuten) * 100);
          return (
            <div key={w.weekStart} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 bg-[--foreground] text-[--background] text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap pointer-events-none">
                <p className="font-semibold">{w.label}</p>
                <p>{w.touren} {w.touren === 1 ? "Tour" : "Touren"}</p>
                <p>{w.einsaetze} Einsätze</p>
                <p>{formatStunden(w.minuten)}</p>
              </div>
              {/* Bar */}
              <div
                className="w-full rounded-t-lg bg-[--primary]/70 hover:bg-[--primary] transition-all cursor-default"
                style={{ height: `${Math.max(heightPct, 2)}%` }}
              />
              <span className="text-[10px] text-[--muted-foreground] leading-none">{w.label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-[--muted-foreground] text-center">Leistungsminuten pro Woche (Hover für Details)</p>
    </div>
  );
}

const WEEK_OPTIONS = [
  { value: 4, label: "4 Wochen" },
  { value: 8, label: "8 Wochen" },
  { value: 12, label: "12 Wochen" },
];

export function KapazitaetClient({ initialData }: Props) {
  const [data, setData] = useState<KapazitaetData>(initialData);
  const [loading, setLoading] = useState(false);
  const [selectedWeeks, setSelectedWeeks] = useState(initialData.weeks);

  const loadData = async (weeks: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kapazitaet?weeks=${weeks}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
      setSelectedWeeks(weeks);
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
    }
  };

  const kpis = [
    {
      label: "Mitarbeiter",
      value: String(data.teamGroesse),
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Aktive Bewohner",
      value: String(data.aktivBewohner),
      icon: Home,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      label: "Betreuungsquote",
      value: data.betreuungsquote !== null ? `${data.betreuungsquote} : 1` : "–",
      icon: Activity,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-900/30",
      sub: "Bewohner pro MA",
    },
    {
      label: "Touren gesamt",
      value: String(data.touren.gesamt),
      icon: TrendingUp,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-100 dark:bg-orange-900/30",
      sub: `${data.touren.abschlussquote}% abgeschlossen`,
    },
    {
      label: "Leistungszeit",
      value: formatStunden(data.einsaetze.totalMinuten),
      icon: Clock,
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-100 dark:bg-cyan-900/30",
      sub: `Ø ${data.einsaetze.avgMinutenProEinsatz} min/Einsatz`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {WEEK_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => loadData(opt.value)}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedWeeks === opt.value
                  ? "bg-[--primary] text-white"
                  : "border border-[--border] text-[--muted-foreground] hover:bg-[--muted]/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => loadData(selectedWeeks)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[--border] text-sm text-[--muted-foreground] hover:bg-[--muted]/40 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-[--border] bg-[--card] p-4 space-y-2">
            <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center`}>
              <k.icon className={`w-5 h-5 ${k.color}`} />
            </div>
            <p className="text-2xl font-bold">{k.value}</p>
            <p className="text-xs text-[--muted-foreground]">{k.label}</p>
            {k.sub && <p className="text-[10px] text-[--muted-foreground]/70">{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* Auslastungs-Ampel + Wochenchart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Auslastungs-Card */}
        <div className="rounded-xl border border-[--border] bg-[--card] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[--foreground]">Auslastung</h3>
            <Zap className="w-5 h-5 text-[--muted-foreground]" />
          </div>

          {/* Gauge */}
          <div className="relative flex flex-col items-center pt-2">
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--muted)" strokeWidth="12" />
                <circle
                  cx="60" cy="60" r="50"
                  fill="none"
                  stroke={data.auslastungProzent < 60 ? "#22c55e" : data.auslastungProzent < 85 ? "#eab308" : "#ef4444"}
                  strokeWidth="12"
                  strokeDasharray={`${Math.min(data.auslastungProzent, 100) * 3.14} 314`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{Math.min(data.auslastungProzent, 999)}%</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <AuslastungsAmpel pct={data.auslastungProzent} />
          </div>

          <div className="text-xs text-[--muted-foreground] text-center space-y-1 pt-2 border-t border-[--border]">
            <p>Basis: 8h × 5 Tage × {data.teamGroesse} MA</p>
            <p>Zeitraum: {data.weeks} Wochen</p>
          </div>
        </div>

        {/* Wochentrend */}
        <div className="lg:col-span-2 rounded-xl border border-[--border] bg-[--card] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[--foreground]">Wöchentlicher Verlauf</h3>
            <BarChart3 className="w-5 h-5 text-[--muted-foreground]" />
          </div>
          {data.wochenTrend.length > 0 ? (
            <WochenChart trend={data.wochenTrend} />
          ) : (
            <div className="flex items-center justify-center h-48 text-[--muted-foreground] text-sm">
              Keine Touren im Zeitraum
            </div>
          )}
        </div>
      </div>

      {/* Detail Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Touren-Statistiken */}
        <div className="rounded-xl border border-[--border] bg-[--card] p-6 space-y-4">
          <h3 className="font-semibold text-[--foreground] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[--muted-foreground]" />
            Touren-Statistiken
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[--muted-foreground]">Gesamt</span>
              <span className="font-medium">{data.touren.gesamt}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[--muted-foreground]">Abgeschlossen</span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                {data.touren.abgeschlossen} ({data.touren.abschlussquote}%)
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[--muted-foreground]">Ø Einsätze/Tour</span>
              <span className="font-medium">{data.einsaetze.avgProTour}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[--muted-foreground]">Einsätze gesamt</span>
              <span className="font-medium">{data.einsaetze.gesamt}</span>
            </div>
            {/* Completion bar */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs text-[--muted-foreground] mb-1">
                <span>Abschlussquote</span>
                <span>{data.touren.abschlussquote}%</span>
              </div>
              <div className="h-2 rounded-full bg-[--muted] overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${data.touren.abschlussquote}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Leistungszeit */}
        <div className="rounded-xl border border-[--border] bg-[--card] p-6 space-y-4">
          <h3 className="font-semibold text-[--foreground] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[--muted-foreground]" />
            Leistungszeiten
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[--muted-foreground]">Gesamt ({data.weeks} Wochen)</span>
              <span className="font-medium">{formatStunden(data.einsaetze.totalMinuten)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[--muted-foreground]">Ø pro Einsatz</span>
              <span className="font-medium">{data.einsaetze.avgMinutenProEinsatz} min</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[--muted-foreground]">Ø pro Woche</span>
              <span className="font-medium">
                {formatStunden(Math.round(data.einsaetze.totalMinuten / Math.max(data.weeks, 1)))}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[--muted-foreground]">Ø pro Tour</span>
              <span className="font-medium">
                {data.touren.gesamt > 0
                  ? formatStunden(Math.round(data.einsaetze.totalMinuten / data.touren.gesamt))
                  : "–"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm pt-2 border-t border-[--border]">
              <span className="text-[--muted-foreground]">Einsätze abgeschlossen</span>
              <span className="flex items-center gap-1.5 font-medium">
                {data.einsaetze.abgeschlossen}
                {data.einsaetze.gesamt > 0 && (
                  <span className="text-xs text-[--muted-foreground]">
                    ({Math.round((data.einsaetze.abgeschlossen / data.einsaetze.gesamt) * 100)}%)
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Team-Bewohner-Ratio Info */}
      <div className="rounded-xl border border-[--border] bg-[--card] p-6">
        <h3 className="font-semibold text-[--foreground] flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-[--muted-foreground]" />
          Team & Bewohner
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-[--primary]">{data.teamGroesse}</p>
            <p className="text-sm text-[--muted-foreground] mt-1">Aktive Mitarbeiter</p>
          </div>
          <div className="text-center flex flex-col items-center justify-center">
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-3xl font-bold">{data.aktivBewohner}</p>
                <p className="text-xs text-[--muted-foreground]">Bewohner</p>
              </div>
              <span className="text-2xl text-[--muted-foreground]">:</span>
              <div className="text-left">
                <p className="text-3xl font-bold">{data.teamGroesse}</p>
                <p className="text-xs text-[--muted-foreground]">Mitarbeiter</p>
              </div>
            </div>
            {data.betreuungsquote !== null && (
              <p className="text-xs text-[--muted-foreground] mt-2">
                {data.betreuungsquote} Bewohner pro Mitarbeiter
              </p>
            )}
          </div>
          <div className="text-center">
            {data.betreuungsquote !== null && (
              <>
                <p className={`text-4xl font-bold ${
                  data.betreuungsquote <= 5 ? "text-green-500" :
                  data.betreuungsquote <= 8 ? "text-yellow-500" : "text-red-500"
                }`}>
                  {data.betreuungsquote <= 5 ? "✓" : data.betreuungsquote <= 8 ? "!" : "⚠"}
                </p>
                <p className="text-sm text-[--muted-foreground] mt-1">
                  {data.betreuungsquote <= 5 ? "Gut" : data.betreuungsquote <= 8 ? "Ausreichend" : "Kritisch"}
                </p>
                <p className="text-xs text-[--muted-foreground]/60 mt-1">
                  {data.betreuungsquote <= 5 ? "≤5 Bewohner/MA" : data.betreuungsquote <= 8 ? "5–8 Bewohner/MA" : ">8 Bewohner/MA"}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {data.touren.gesamt === 0 && (
        <div className="text-center py-10 border border-dashed border-[--border] rounded-2xl">
          <AlertCircle className="w-12 h-12 text-[--muted-foreground] mx-auto mb-3 opacity-40" />
          <p className="text-[--muted-foreground]">Keine Touren im gewählten Zeitraum</p>
          <p className="text-sm text-[--muted-foreground]/70 mt-1">Erstelle Touren in der Tourenplanung, um Auslastungsdaten zu sehen.</p>
        </div>
      )}
    </div>
  );
}

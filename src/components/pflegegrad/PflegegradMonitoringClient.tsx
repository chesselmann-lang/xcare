"use client";

import { useState } from "react";
import { format, parseISO, differenceInDays, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import {
  AlertTriangle, CheckCircle, Clock, Brain, ChevronDown,
  ChevronUp, TrendingUp, Users, Activity, Calendar,
  AlertCircle, Sparkles,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Klient {
  familieProfileId: string;
  name: string;
  letzteEinschaetzung: string;
  aktuellerPflegegrad: number | null;
  pflegegradEmpfehlung: number | null;
  gesamtpunkte: number | null;
  notizen: string | null;
  anzahlEinschaetzungen: number;
}

interface Stats {
  gesamt: number;
  ueberfaellig: number;
  baldFaellig: number;
  aktuell: number;
}

interface Props {
  klienten: Klient[];
  stats: Stats;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUrgency(letzteEinschaetzung: string): "overdue" | "soon" | "ok" {
  const days = differenceInDays(new Date(), parseISO(letzteEinschaetzung));
  if (days > 180) return "overdue";
  if (days > 90) return "soon";
  return "ok";
}

function getNextReviewDate(letzteEinschaetzung: string): string {
  const d = parseISO(letzteEinschaetzung);
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().split("T")[0];
}

const PG_COLORS: Record<number, string> = {
  1: "bg-gray-100 text-gray-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-amber-100 text-amber-700",
  4: "bg-orange-100 text-orange-700",
  5: "bg-red-100 text-red-700",
};

const URGENCY_CONFIG = {
  overdue: {
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    label: "Überprüfung überfällig",
    chip: "bg-red-100 text-red-700",
  },
  soon: {
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    label: "Überprüfung bald fällig",
    chip: "bg-amber-100 text-amber-700",
  },
  ok: {
    icon: CheckCircle,
    color: "text-emerald-600",
    bg: "bg-[--card] border-[--border]",
    label: "Aktuell",
    chip: "bg-emerald-100 text-emerald-700",
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function PflegegradMonitoringClient({ klienten, stats }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analyseState, setAnalyseState] = useState<
    Record<string, { loading: boolean; result: string | null; error: string | null }>
  >({});
  const [filterUrgency, setFilterUrgency] = useState<"all" | "overdue" | "soon" | "ok">("all");

  const filtered =
    filterUrgency === "all"
      ? klienten
      : klienten.filter((k) => getUrgency(k.letzteEinschaetzung) === filterUrgency);

  async function runAnalyse(klient: Klient) {
    setAnalyseState((prev) => ({
      ...prev,
      [klient.familieProfileId]: { loading: true, result: null, error: null },
    }));
    try {
      const res = await fetch("/api/pflegegrad-monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familieProfileId: klient.familieProfileId,
          aktuellerPflegegrad: klient.aktuellerPflegegrad ?? undefined,
          letzteEinschaetzungDatum: klient.letzteEinschaetzung,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAnalyseState((prev) => ({
        ...prev,
        [klient.familieProfileId]: { loading: false, result: data.analyse, error: null },
      }));
    } catch (err) {
      setAnalyseState((prev) => ({
        ...prev,
        [klient.familieProfileId]: {
          loading: false,
          result: null,
          error: err instanceof Error ? err.message : "Fehler bei der Analyse",
        },
      }));
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[--foreground] flex items-center gap-2">
          <Activity className="h-6 w-6 text-[--primary]" />
          Pflegegrad-Monitoring
        </h1>
        <p className="text-sm text-[--muted-foreground] mt-1">
          Überblick über Pflegegrade Ihrer Klienten · Wiederholungsprüfungs-Empfehlungen · KI-Analyse
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Klienten gesamt"
          value={stats.gesamt}
          color="blue"
        />
        <StatCard
          icon={AlertTriangle}
          label="Überprüfung überfällig"
          value={stats.ueberfaellig}
          color="red"
          onClick={() => setFilterUrgency(filterUrgency === "overdue" ? "all" : "overdue")}
          active={filterUrgency === "overdue"}
        />
        <StatCard
          icon={Clock}
          label="Bald fällig (3–6 Mo.)"
          value={stats.baldFaellig}
          color="amber"
          onClick={() => setFilterUrgency(filterUrgency === "soon" ? "all" : "soon")}
          active={filterUrgency === "soon"}
        />
        <StatCard
          icon={CheckCircle}
          label="Aktuell (< 3 Mo.)"
          value={stats.aktuell}
          color="green"
          onClick={() => setFilterUrgency(filterUrgency === "ok" ? "all" : "ok")}
          active={filterUrgency === "ok"}
        />
      </div>

      {/* Filter tabs */}
      {filterUrgency !== "all" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[--muted-foreground]">Gefiltert nach:</span>
          <span className="text-xs px-3 py-1 rounded-full bg-[--primary] text-white font-medium">
            {filterUrgency === "overdue"
              ? "Überprüfung überfällig"
              : filterUrgency === "soon"
              ? "Bald fällig"
              : "Aktuell"}
          </span>
          <button
            onClick={() => setFilterUrgency("all")}
            className="text-xs text-[--muted-foreground] hover:text-[--foreground] underline"
          >
            Filter entfernen
          </button>
        </div>
      )}

      {/* Klienten list */}
      {filtered.length === 0 ? (
        <div className="bg-[--card] border border-[--border] rounded-2xl p-12 text-center">
          <Activity size={40} className="mx-auto text-[--muted-foreground] opacity-40 mb-3" />
          <p className="text-sm text-[--muted-foreground]">
            {klienten.length === 0
              ? "Noch keine Pflegegrad-Einschätzungen vorhanden."
              : "Keine Klienten in dieser Kategorie."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((klient) => {
            const urgency = getUrgency(klient.letzteEinschaetzung);
            const cfg = URGENCY_CONFIG[urgency];
            const Icon = cfg.icon;
            const isExpanded = expandedId === klient.familieProfileId;
            const analyse = analyseState[klient.familieProfileId];
            const nextReview = getNextReviewDate(klient.letzteEinschaetzung);
            const daysSince = differenceInDays(new Date(), parseISO(klient.letzteEinschaetzung));
            const upgradeHint =
              klient.pflegegradEmpfehlung != null &&
              klient.aktuellerPflegegrad != null &&
              klient.pflegegradEmpfehlung > klient.aktuellerPflegegrad;

            return (
              <div
                key={klient.familieProfileId}
                className={`border rounded-2xl overflow-hidden ${cfg.bg}`}
              >
                {/* Card header */}
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[--foreground]">{klient.name}</span>
                        {klient.aktuellerPflegegrad && (
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                              PG_COLORS[klient.aktuellerPflegegrad] ?? "bg-gray-100 text-gray-700"
                            }`}
                          >
                            PG {klient.aktuellerPflegegrad}
                          </span>
                        )}
                        {upgradeHint && (
                          <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                            <TrendingUp size={11} />
                            Höherstufung möglich
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-[--muted-foreground] flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          Letzte Einschätzung:{" "}
                          {format(parseISO(klient.letzteEinschaetzung), "dd.MM.yyyy", { locale: de })}
                          {" "}({daysSince} Tage)
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          Nächste fällig: {format(parseISO(nextReview), "dd.MM.yyyy", { locale: de })}
                        </span>
                        <span>{klient.anzahlEinschaetzungen} Einschätzung(en)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.chip}`}>
                        <Icon size={11} />
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : klient.familieProfileId)
                      }
                      className="flex items-center gap-1 text-xs text-[--muted-foreground] hover:text-[--foreground] transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      {isExpanded ? "Weniger" : "Details"}
                    </button>
                    <span className="text-[--border]">·</span>
                    <button
                      onClick={() => runAnalyse(klient)}
                      disabled={analyse?.loading}
                      className="flex items-center gap-1.5 text-xs text-[--primary] hover:text-[--primary]/80 font-medium disabled:opacity-50 transition-colors"
                    >
                      {analyse?.loading ? (
                        <>
                          <span className="h-3 w-3 rounded-full border-2 border-[--primary]/30 border-t-[--primary] animate-spin" />
                          KI analysiert…
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} />
                          KI-Analyse starten
                        </>
                      )}
                    </button>
                    <span className="text-[--border]">·</span>
                    <a
                      href={`/anbieter/pflegegrad?familie=${klient.familieProfileId}`}
                      className="text-xs text-[--muted-foreground] hover:text-[--foreground] transition-colors"
                    >
                      Zur Einschätzung →
                    </a>
                  </div>
                </div>

                {/* Detail / AI panel */}
                {isExpanded && (
                  <div className="border-t border-[--border] px-5 py-4 bg-[--background] space-y-4">
                    {/* Pflegegrad info */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      <div className="bg-[--card] border border-[--border] rounded-xl p-3">
                        <div className="text-xs text-[--muted-foreground] mb-0.5">Aktueller PG</div>
                        <div className="font-bold text-lg text-[--foreground]">
                          {klient.aktuellerPflegegrad
                            ? `PG ${klient.aktuellerPflegegrad}`
                            : "Unbekannt"}
                        </div>
                      </div>
                      <div className="bg-[--card] border border-[--border] rounded-xl p-3">
                        <div className="text-xs text-[--muted-foreground] mb-0.5">Empfehlung</div>
                        <div
                          className={`font-bold text-lg ${
                            upgradeHint ? "text-purple-600" : "text-[--foreground]"
                          }`}
                        >
                          {klient.pflegegradEmpfehlung
                            ? `PG ${klient.pflegegradEmpfehlung}`
                            : "—"}
                        </div>
                      </div>
                      <div className="bg-[--card] border border-[--border] rounded-xl p-3">
                        <div className="text-xs text-[--muted-foreground] mb-0.5">Gesamtpunkte</div>
                        <div className="font-bold text-lg text-[--foreground]">
                          {klient.gesamtpunkte ?? "—"}
                        </div>
                      </div>
                    </div>

                    {klient.notizen && (
                      <div className="bg-[--card] border border-[--border] rounded-xl p-3">
                        <div className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wide mb-1">
                          Notizen aus letzter Einschätzung
                        </div>
                        <p className="text-sm text-[--foreground] whitespace-pre-wrap">
                          {klient.notizen}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Analyse result */}
                {analyse?.result && (
                  <div className="border-t border-purple-200 px-5 py-4 bg-purple-50 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
                      <Brain size={14} />
                      KI-Analyse — Wiederholungsprüfungs-Assistent
                    </div>
                    <div className="text-sm text-purple-900 whitespace-pre-wrap leading-relaxed">
                      {analyse.result}
                    </div>
                    <p className="text-[10px] text-purple-600 pt-1">
                      ⚠ Diese KI-Analyse ist eine Einschätzungshilfe und ersetzt keine professionelle Begutachtung durch den MD/MDK.
                    </p>
                  </div>
                )}
                {analyse?.error && (
                  <div className="border-t border-red-200 px-5 py-3 bg-red-50">
                    <p className="text-xs text-red-600 flex items-center gap-1.5">
                      <AlertCircle size={12} />
                      {analyse.error}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  onClick,
  active,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: "blue" | "red" | "amber" | "green";
  onClick?: () => void;
  active?: boolean;
}) {
  const colorMap = {
    blue:  { bg: "bg-blue-50",    icon: "text-blue-600",    border: "border-blue-200"    },
    red:   { bg: "bg-red-50",     icon: "text-red-600",     border: "border-red-200"     },
    amber: { bg: "bg-amber-50",   icon: "text-amber-600",   border: "border-amber-200"   },
    green: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-200" },
  };
  const c = colorMap[color];

  return (
    <div
      onClick={onClick}
      className={`border rounded-xl p-4 transition-all ${c.bg} ${c.border} ${
        onClick ? "cursor-pointer hover:shadow-md" : ""
      } ${active ? "ring-2 ring-[--primary]" : ""}`}
    >
      <Icon size={20} className={c.icon} />
      <div className="mt-2 text-2xl font-bold text-[--foreground]">{value}</div>
      <div className="text-xs text-[--muted-foreground] mt-0.5">{label}</div>
    </div>
  );
}

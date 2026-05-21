/**
 * ZuverlaessigkeitsScore — Reliability score badge for Anbieter profiles (S324)
 *
 * Score is computed server-side from three signals:
 *   - Ø Antwortzeit (30 %)
 *   - Abschlussquote (40 %)
 *   - Ø Sternebewertung (30 %)
 *
 * Missing signals are dropped and remaining weights renormalized so the
 * badge only appears when we have at least one real data point.
 */

import { Award } from "lucide-react";

export interface ZuverlaessigkeitsDaten {
  /** Average response time in hours — null if unknown */
  avgAntwortzeit_h: number | null;
  /** avg star rating 0–5 — null if no reviews */
  avgSterne: number | null;
  /** Number of "abgeschlossen" anfragen */
  abgeschlossen: number;
  /** Total anfragen handled by this anbieter (any non-offen status) */
  totalAnfragen: number;
}

/** Convert avg response time in hours to a 0-100 sub-score. */
function antwortzeitScore(h: number): number {
  if (h <= 2) return 100;
  if (h <= 4) return 90;
  if (h <= 8) return 80;
  if (h <= 24) return 70;
  if (h <= 48) return 50;
  if (h <= 72) return 30;
  return 10;
}

/** Compute overall score 0–100 and confidence (0–3 signals). */
export function berechneZuverlaessigkeit(d: ZuverlaessigkeitsDaten): {
  score: number;
  signals: number;
} | null {
  const components: Array<{ value: number; weight: number }> = [];

  if (d.avgAntwortzeit_h !== null && d.avgAntwortzeit_h > 0) {
    components.push({ value: antwortzeitScore(d.avgAntwortzeit_h), weight: 30 });
  }

  if (d.totalAnfragen > 0) {
    const quote = Math.min(d.abgeschlossen / d.totalAnfragen, 1);
    components.push({ value: Math.round(quote * 100), weight: 40 });
  }

  if (d.avgSterne !== null && d.avgSterne > 0) {
    components.push({ value: Math.round((d.avgSterne / 5) * 100), weight: 30 });
  }

  if (components.length === 0) return null;

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const score = Math.round(
    components.reduce((s, c) => s + c.value * c.weight, 0) / totalWeight
  );

  return { score, signals: components.length };
}

function scoreLabel(score: number): {
  label: string;
  color: string;
  bg: string;
  border: string;
  ring: string;
} {
  if (score >= 90)
    return { label: "Exzellent", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", ring: "text-emerald-500" };
  if (score >= 75)
    return { label: "Sehr gut", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", ring: "text-green-500" };
  if (score >= 60)
    return { label: "Gut", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", ring: "text-blue-500" };
  if (score >= 40)
    return { label: "Solide", color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200", ring: "text-yellow-500" };
  return { label: "Im Aufbau", color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200", ring: "text-gray-400" };
}

interface Props {
  daten: ZuverlaessigkeitsDaten;
  /** If true, shows a compact inline badge instead of the full card */
  compact?: boolean;
}

export function ZuverlaessigkeitsScore({ daten, compact = false }: Props) {
  const result = berechneZuverlaessigkeit(daten);
  if (!result || result.signals < 1) return null;

  const { score } = result;
  const cfg = scoreLabel(score);

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}
        title={`Zuverlässigkeits-Score: ${score}/100`}
        aria-label={`Zuverlässigkeits-Score: ${score} von 100 — ${cfg.label}`}
      >
        <Award className="h-3.5 w-3.5" aria-hidden />
        {cfg.label} · {score}/100
      </span>
    );
  }

  return (
    <div
      className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}
      aria-label={`Zuverlässigkeits-Score: ${score} von 100 — ${cfg.label}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Award className={`h-5 w-5 ${cfg.ring}`} aria-hidden />
          <div>
            <p className={`text-sm font-semibold ${cfg.color}`}>
              Zuverlässigkeits-Score
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Basiert auf Antwortzeit, Abschlussrate
              {daten.avgSterne ? " & Bewertungen" : ""}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-2xl font-bold ${cfg.color}`}>{score}</p>
          <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 bg-white/60 rounded-full overflow-hidden border border-white/40">
        <div
          className={`h-full rounded-full transition-all ${
            score >= 75 ? "bg-green-400" : score >= 60 ? "bg-blue-400" : score >= 40 ? "bg-yellow-400" : "bg-gray-400"
          }`}
          style={{ width: `${score}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

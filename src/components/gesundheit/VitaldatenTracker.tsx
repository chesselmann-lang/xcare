"use client";

import { useState, useTransition } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Plus, Loader2 } from "lucide-react";

type VitalTyp =
  | "blutdruck_systolisch"
  | "blutdruck_diastolisch"
  | "puls"
  | "temperatur"
  | "gewicht"
  | "blutzucker"
  | "sauerstoffsaettigung"
  | "atemfrequenz"
  | "schmerz_score"
  | "mobilitaet_score"
  | "stimmung_score"
  | "schlaf_stunden";

interface VitalEntry {
  id: string;
  wert: number;
  gemessen_am: string;
}

interface Props {
  initialGrouped: Record<string, VitalEntry[]>;
}

interface VitalConfig {
  label: string;
  einheit: string;
  min: number;
  max: number;
  step: number;
  normalMin: number;
  normalMax: number;
  warnMin?: number;
  warnMax?: number;
  critMin?: number;
  critMax?: number;
  emoji: string;
}

const VITAL_CONFIG: Record<VitalTyp, VitalConfig> = {
  blutdruck_systolisch: {
    label: "Blutdruck syst.",
    einheit: "mmHg",
    min: 60,
    max: 220,
    step: 1,
    normalMin: 90,
    normalMax: 140,
    warnMin: 80,
    warnMax: 160,
    critMin: 70,
    critMax: 180,
    emoji: "💓",
  },
  blutdruck_diastolisch: {
    label: "Blutdruck diast.",
    einheit: "mmHg",
    min: 40,
    max: 140,
    step: 1,
    normalMin: 60,
    normalMax: 90,
    warnMax: 100,
    critMax: 110,
    emoji: "💗",
  },
  puls: {
    label: "Puls",
    einheit: "bpm",
    min: 30,
    max: 200,
    step: 1,
    normalMin: 60,
    normalMax: 100,
    warnMin: 50,
    warnMax: 120,
    critMin: 40,
    critMax: 150,
    emoji: "❤️",
  },
  temperatur: {
    label: "Temperatur",
    einheit: "°C",
    min: 34,
    max: 42,
    step: 0.1,
    normalMin: 36.0,
    normalMax: 37.5,
    warnMax: 38.5,
    critMax: 39.5,
    emoji: "🌡️",
  },
  gewicht: {
    label: "Gewicht",
    einheit: "kg",
    min: 30,
    max: 250,
    step: 0.1,
    normalMin: 0,
    normalMax: 999,
    emoji: "⚖️",
  },
  blutzucker: {
    label: "Blutzucker",
    einheit: "mg/dL",
    min: 40,
    max: 400,
    step: 1,
    normalMin: 70,
    normalMax: 140,
    warnMax: 180,
    critMax: 250,
    emoji: "🩸",
  },
  sauerstoffsaettigung: {
    label: "O₂-Sättigung",
    einheit: "%",
    min: 70,
    max: 100,
    step: 1,
    normalMin: 95,
    normalMax: 100,
    warnMin: 90,
    critMin: 85,
    emoji: "🫁",
  },
  atemfrequenz: {
    label: "Atemfrequenz",
    einheit: "/min",
    min: 8,
    max: 40,
    step: 1,
    normalMin: 12,
    normalMax: 20,
    warnMax: 25,
    critMax: 30,
    emoji: "💨",
  },
  schmerz_score: {
    label: "Schmerz-Score",
    einheit: "/10",
    min: 0,
    max: 10,
    step: 1,
    normalMin: 0,
    normalMax: 3,
    warnMin: 4,
    warnMax: 6,
    critMin: 7,
    emoji: "😣",
  },
  mobilitaet_score: {
    label: "Mobilität",
    einheit: "/10",
    min: 0,
    max: 10,
    step: 1,
    normalMin: 6,
    normalMax: 10,
    warnMin: 3,
    warnMax: 5,
    emoji: "🚶",
  },
  stimmung_score: {
    label: "Stimmung",
    einheit: "/10",
    min: 0,
    max: 10,
    step: 1,
    normalMin: 5,
    normalMax: 10,
    warnMin: 3,
    warnMax: 4,
    emoji: "😊",
  },
  schlaf_stunden: {
    label: "Schlaf",
    einheit: "h",
    min: 0,
    max: 24,
    step: 0.5,
    normalMin: 6,
    normalMax: 9,
    warnMin: 4,
    warnMax: 11,
    emoji: "😴",
  },
};

function getStatusColor(wert: number, cfg: VitalConfig): string {
  const { normalMin, normalMax, warnMin, warnMax, critMin, critMax } = cfg;
  const isCrit =
    (critMin !== undefined && wert < critMin) ||
    (critMax !== undefined && wert > critMax);
  const isWarn =
    (warnMin !== undefined && wert < warnMin) ||
    (warnMax !== undefined && wert > warnMax);
  const isNormal = wert >= normalMin && wert <= normalMax;

  if (isCrit) return "border-red-400 bg-red-50";
  if (!isNormal || isWarn) return "border-yellow-400 bg-yellow-50";
  return "border-green-400 bg-green-50";
}

function getValueColor(wert: number, cfg: VitalConfig): string {
  const { normalMin, normalMax, critMin, critMax, warnMin, warnMax } = cfg;
  const isCrit =
    (critMin !== undefined && wert < critMin) ||
    (critMax !== undefined && wert > critMax);
  const isWarn =
    (warnMin !== undefined && wert < warnMin) ||
    (warnMax !== undefined && wert > warnMax);
  const isNormal = wert >= normalMin && wert <= normalMax;

  if (isCrit) return "text-red-700 font-bold";
  if (!isNormal || isWarn) return "text-yellow-700 font-semibold";
  return "text-green-700 font-semibold";
}

function MiniSparkline({ data }: { data: VitalEntry[] }) {
  if (data.length < 2) return null;
  const chartData = [...data]
    .sort((a, b) => new Date(a.gemessen_am).getTime() - new Date(b.gemessen_am).getTime())
    .slice(-7)
    .map((d) => ({ wert: d.wert }));

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="wert"
          stroke="#6366f1"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 11, padding: "2px 6px", borderRadius: 4 }}
          formatter={(v: number) => [v]}
          labelFormatter={() => ""}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function VitaldatenTracker({ initialGrouped }: Props) {
  const [grouped, setGrouped] = useState(initialGrouped);
  const [inputs, setInputs] = useState<Partial<Record<VitalTyp, string>>>({});
  const [saving, setSaving] = useState<Partial<Record<VitalTyp, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<VitalTyp, string>>>({});
  const [, startTransition] = useTransition();

  async function handleSave(typ: VitalTyp) {
    const raw = inputs[typ];
    if (!raw) return;
    const wert = parseFloat(raw);
    if (isNaN(wert)) {
      setErrors((e) => ({ ...e, [typ]: "Ungültiger Wert" }));
      return;
    }

    setSaving((s) => ({ ...s, [typ]: true }));
    setErrors((e) => ({ ...e, [typ]: undefined }));

    try {
      const res = await fetch("/api/vitaldaten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typ, wert, einheit: VITAL_CONFIG[typ].einheit }),
      });
      if (!res.ok) throw new Error("Fehler beim Speichern");
      const saved = await res.json();

      startTransition(() => {
        setGrouped((prev) => ({
          ...prev,
          [typ]: [
            { id: saved.id, wert: Number(saved.wert), gemessen_am: saved.gemessen_am },
            ...(prev[typ] ?? []),
          ],
        }));
        setInputs((i) => ({ ...i, [typ]: "" }));
      });
    } catch {
      setErrors((e) => ({ ...e, [typ]: "Speichern fehlgeschlagen" }));
    } finally {
      setSaving((s) => ({ ...s, [typ]: false }));
    }
  }

  const VITAL_TYPES = Object.keys(VITAL_CONFIG) as VitalTyp[];

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-[--foreground]">Messwert erfassen</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {VITAL_TYPES.map((typ) => {
          const cfg = VITAL_CONFIG[typ];
          const entries = grouped[typ] ?? [];
          const latest = entries[0];
          const borderClass = latest
            ? getStatusColor(latest.wert, cfg)
            : "border-gray-200 bg-white";

          return (
            <div
              key={typ}
              className={`rounded-xl border-2 p-4 space-y-2 transition-colors ${borderClass}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <span>{cfg.emoji}</span>
                  {cfg.label}
                </span>
                {latest && (
                  <span className={`text-sm ${getValueColor(latest.wert, cfg)}`}>
                    {latest.wert} {cfg.einheit}
                  </span>
                )}
              </div>

              {/* Sparkline */}
              {entries.length >= 2 && <MiniSparkline data={entries} />}

              {/* Input row */}
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={cfg.min}
                  max={cfg.max}
                  step={cfg.step}
                  value={inputs[typ] ?? ""}
                  onChange={(e) =>
                    setInputs((i) => ({ ...i, [typ]: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleSave(typ)}
                  placeholder={`${cfg.min}–${cfg.max} ${cfg.einheit}`}
                  className="flex-1 min-w-0 text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[--primary] bg-white"
                />
                <button
                  onClick={() => handleSave(typ)}
                  disabled={!inputs[typ] || saving[typ]}
                  className="flex items-center gap-1 text-sm bg-[--primary] text-white px-2.5 py-1.5 rounded-lg hover:bg-[--primary]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving[typ] ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {errors[typ] && (
                <p className="text-xs text-red-600">{errors[typ]}</p>
              )}

              {/* Last measured */}
              {latest && (
                <p className="text-xs text-gray-400">
                  Zuletzt:{" "}
                  {new Date(latest.gemessen_am).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

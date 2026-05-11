"use client";
import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

interface WohlbefindenEintrag {
  id: string;
  erfasst_am: string;
  schlaf: number | null;
  schmerz: number | null;
  stimmung: number | null;
  mobilitaet: number | null;
  appetit: number | null;
  notiz: string | null;
  erfasst_von_rolle: string;
}

interface Props {
  eintraege: WohlbefindenEintrag[];
  isAnbieter: boolean;
  familieProfileId?: string;
}

const METRIKEN = [
  { key: "schlaf",      label: "Schlaf",     color: "#6366f1", emoji: "😴" },
  { key: "stimmung",    label: "Stimmung",   color: "#f59e0b", emoji: "😊" },
  { key: "schmerz",     label: "Schmerz",    color: "#ef4444", emoji: "😣" },
  { key: "mobilitaet",  label: "Mobilität",  color: "#10b981", emoji: "🚶" },
  { key: "appetit",     label: "Appetit",    color: "#8b5cf6", emoji: "🍽️" },
] as const;

const WERT_LABELS: Record<number, string> = {
  1: "Sehr schlecht",
  2: "Schlecht",
  3: "Mittel",
  4: "Gut",
  5: "Sehr gut",
};

function SmileyRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  const smileys = [
    { v: 1, emoji: "😫", label: "Sehr schlecht" },
    { v: 2, emoji: "😟", label: "Schlecht" },
    { v: 3, emoji: "😐", label: "Mittel" },
    { v: 4, emoji: "😊", label: "Gut" },
    { v: 5, emoji: "😄", label: "Sehr gut" },
  ];
  return (
    <div className="flex gap-2">
      {smileys.map(({ v, emoji, label }) => (
        <button
          key={v}
          type="button"
          title={label}
          onClick={() => onChange(v)}
          className={`text-2xl transition-transform hover:scale-125 ${
            value === v ? "scale-125 ring-2 ring-blue-500 rounded-full" : "opacity-60"
          }`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export default function WohlbefindenClient({ eintraege: initial, isAnbieter, familieProfileId }: Props) {
  const [eintraege, setEintraege] = useState(initial);
  const [view, setView] = useState<"heute" | "verlauf">("heute");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = eintraege.find((e) => e.erfasst_am === today);

  const [form, setForm] = useState({
    schlaf:     todayEntry?.schlaf     ?? null as number | null,
    schmerz:    todayEntry?.schmerz    ?? null as number | null,
    stimmung:   todayEntry?.stimmung   ?? null as number | null,
    mobilitaet: todayEntry?.mobilitaet ?? null as number | null,
    appetit:    todayEntry?.appetit    ?? null as number | null,
    notiz:      todayEntry?.notiz      ?? "",
  });

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        ...form,
        erfasst_am: today,
        ...(isAnbieter && familieProfileId ? { familie_profile_id: familieProfileId } : {}),
      };
      const res = await fetch("/api/wohlbefinden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const entry = await res.json();
      setEintraege((prev) => {
        const filtered = prev.filter((e) => e.erfasst_am !== today);
        return [entry, ...filtered];
      });
      setMsg("✓ Gespeichert");
    } catch {
      setMsg("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  // Chart data
  const chartData = [...eintraege]
    .reverse()
    .slice(-30)
    .map((e) => ({
      datum: format(parseISO(e.erfasst_am), "dd.MM", { locale: de }),
      schlaf: e.schlaf,
      schmerz: e.schmerz,
      stimmung: e.stimmung,
      mobilitaet: e.mobilitaet,
      appetit: e.appetit,
    }));

  // KPI averages (last 7 days)
  const last7 = eintraege.slice(0, 7);
  const avg = (key: keyof typeof form) => {
    const vals = last7.map((e) => (e as Record<string, unknown>)[key] as number | null).filter((v) => v !== null) as number[];
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—";
  };

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {METRIKEN.map((m) => (
          <div key={m.key} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-2xl">{m.emoji}</div>
            <div className="text-xs text-gray-500 mt-1">{m.label}</div>
            <div className="text-xl font-bold mt-1" style={{ color: m.color }}>
              {avg(m.key as keyof typeof form)}
            </div>
            <div className="text-xs text-gray-400">Ø 7 Tage</div>
          </div>
        ))}
      </div>

      {/* Tab Switch */}
      <div className="flex gap-2">
        <button
          onClick={() => setView("heute")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === "heute"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Heute erfassen
        </button>
        <button
          onClick={() => setView("verlauf")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === "verlauf"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Verlauf
        </button>
      </div>

      {view === "heute" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-5">
            Wie geht es heute? —{" "}
            <span className="text-gray-500 font-normal">
              {format(new Date(), "dd. MMMM yyyy", { locale: de })}
            </span>
          </h3>

          <div className="space-y-6">
            {METRIKEN.map((m) => (
              <div key={m.key}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{m.emoji}</span>
                  <span className="font-medium text-gray-700">{m.label}</span>
                  {form[m.key as keyof typeof form] !== null && (
                    <span className="text-sm text-gray-500 ml-auto">
                      {WERT_LABELS[form[m.key as keyof typeof form] as number]}
                    </span>
                  )}
                </div>
                <SmileyRating
                  value={form[m.key as keyof typeof form] as number | null}
                  onChange={(v) => setForm((f) => ({ ...f, [m.key]: v }))}
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notiz (optional)</label>
              <textarea
                rows={3}
                value={form.notiz}
                onChange={(e) => setForm((f) => ({ ...f, notiz: e.target.value }))}
                placeholder="Besonderheiten, Beobachtungen..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Speichern…" : todayEntry ? "Aktualisieren" : "Speichern"}
              </button>
              {msg && (
                <span className={`text-sm ${msg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
                  {msg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {view === "verlauf" && (
        <div className="space-y-6">
          {chartData.length >= 2 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-700 mb-4">Verlauf — letzte 30 Tage</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="datum" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      v ? WERT_LABELS[v] ?? v : "—",
                      METRIKEN.find((m) => m.key === name)?.label ?? name,
                    ]}
                  />
                  <Legend formatter={(v) => METRIKEN.find((m) => m.key === v)?.label ?? v} />
                  {METRIKEN.map((m) => (
                    <Line
                      key={m.key}
                      type="monotone"
                      dataKey={m.key}
                      stroke={m.color}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              Mindestens 2 Einträge für den Verlauf erforderlich.
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 font-medium text-gray-700 text-sm">
              Alle Einträge
            </div>
            {eintraege.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">Noch keine Einträge</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {eintraege.map((e) => (
                  <div key={e.id} className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-sm font-medium text-gray-700 w-24 shrink-0">
                      {format(parseISO(e.erfasst_am), "dd.MM.yyyy", { locale: de })}
                    </span>
                    {METRIKEN.map((m) => {
                      const v = (e as Record<string, unknown>)[m.key] as number | null;
                      return v !== null ? (
                        <span
                          key={m.key}
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: m.color + "20", color: m.color }}
                        >
                          {m.emoji} {v}/5
                        </span>
                      ) : null;
                    })}
                    {e.notiz && (
                      <span className="text-xs text-gray-400 italic truncate max-w-xs">{e.notiz}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

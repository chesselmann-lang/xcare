"use client";

/**
 * PflegetagebuchClient (S319)
 *
 * Zeigt:
 *  - Stimmungs-Verlaufs-Chart (recharts AreaChart, letzte 30 Tage)
 *  - Formular für neuen Eintrag (Datum, Stimmung 1-5, Notizen)
 *  - Chronologische Timeline aller Einträge
 *
 * Kommuniziert mit /api/pflegetagebuch (GET / POST / DELETE).
 */

import { useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import {
  Plus,
  BookOpen,
  X,
  Moon,
  Activity,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { STIMMUNG_EMOJI, STIMMUNG_LABEL } from "@/lib/pflegeplan/types";
import type { Pflegetagebucheintrag } from "@/lib/pflegeplan/types";

// ── Typen ─────────────────────────────────────────────────────────────────────

interface Props {
  eintraege: Pflegetagebucheintrag[];
}

const EMPTY_FORM = {
  eintrag_datum: new Date().toISOString().split("T")[0],
  stimmung: "" as string,
  schlaf_stunden: "",
  schmerzen: "" as string,
  aktivitaeten: "",
  notizen: "",
  erstellt_von: "",
};

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

function formatDatum(datum: string): string {
  return new Date(datum).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatDatumLang(datum: string): string {
  return new Date(datum).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Letzten N Tage als Datum-Array (YYYY-MM-DD) */
function letzteNTage(n: number): string[] {
  const tage: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    tage.push(d.toISOString().split("T")[0]);
  }
  return tage;
}

// ── SchmerzBalken ─────────────────────────────────────────────────────────────

function SchmerzBalken({ wert }: { wert: number }) {
  const farbe =
    wert <= 2 ? "bg-green-500" :
    wert <= 4 ? "bg-yellow-400" :
    wert <= 6 ? "bg-orange-400" :
    "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-[--muted] rounded-full overflow-hidden max-w-[120px]">
        <div
          className={`h-full rounded-full transition-all ${farbe}`}
          style={{ width: `${(wert / 10) * 100}%` }}
        />
      </div>
      <span className="text-xs text-[--muted-foreground] w-4">{wert}</span>
    </div>
  );
}

// ── Custom Tooltip für recharts ───────────────────────────────────────────────

function StimmungsTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const wert = payload[0].value;
  return (
    <div className="bg-[--background] border border-[--border] rounded-lg px-3 py-2 shadow-sm text-xs">
      <p className="font-medium text-[--foreground]">{label}</p>
      <p className="text-[--muted-foreground] mt-0.5">
        {STIMMUNG_EMOJI[wert]} {STIMMUNG_LABEL[wert]}
      </p>
    </div>
  );
}

// ── Hauptkomponente ────────────────────────────────────────────────────────────

export default function PflegetagebuchClient({ eintraege: initialEintraege }: Props) {
  const [eintraege, setEintraege] = useState<Pflegetagebucheintrag[]>(initialEintraege);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ── Chart-Daten vorbereiten (letzte 30 Tage) ───────────────────────────────

  const chartDaten = useCallback(() => {
    const tageMap = new Map(
      eintraege
        .filter((e) => e.stimmung !== null)
        .map((e) => [e.eintrag_datum, e.stimmung as number])
    );
    return letzteNTage(30).map((datum) => ({
      datum: formatDatum(datum),
      stimmung: tageMap.get(datum) ?? null,
    }));
  }, [eintraege]);

  // ── Formular ───────────────────────────────────────────────────────────────

  async function erstellen() {
    setSaving(true);
    try {
      const res = await fetch("/api/pflegetagebuch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eintrag_datum: form.eintrag_datum,
          stimmung: form.stimmung ? parseInt(form.stimmung) : null,
          schlaf_stunden: form.schlaf_stunden ? parseFloat(form.schlaf_stunden) : null,
          schmerzen: form.schmerzen !== "" ? parseInt(form.schmerzen) : null,
          aktivitaeten: form.aktivitaeten.trim() || null,
          notizen: form.notizen.trim() || null,
          erstellt_von: form.erstellt_von.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      toast.success("Eintrag gespeichert");
      setShowForm(false);
      setForm({ ...EMPTY_FORM, eintrag_datum: new Date().toISOString().split("T")[0] });
      setEintraege((prev) =>
        [json.data, ...prev].sort(
          (a, b) => new Date(b.eintrag_datum).getTime() - new Date(a.eintrag_datum).getTime()
        )
      );
    } catch {
      toast.error("Fehler beim Speichern des Eintrags.");
    } finally {
      setSaving(false);
    }
  }

  async function loeschen(id: string) {
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/pflegetagebuch?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Eintrag gelöscht");
      setEintraege((prev) => prev.filter((e) => e.id !== id));
    } catch {
      toast.error("Fehler beim Löschen.");
    }
  }

  // ── Statistiken ────────────────────────────────────────────────────────────

  const mitStimmung = eintraege.filter((e) => e.stimmung !== null);
  const durchschnitt =
    mitStimmung.length > 0
      ? (mitStimmung.reduce((s, e) => s + (e.stimmung ?? 0), 0) / mitStimmung.length).toFixed(1)
      : null;

  const daten = chartDaten();
  const hatChartDaten = daten.some((d) => d.stimmung !== null);

  return (
    <div className="space-y-6">
      {/* ── Statistik-Zeile ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[--border] p-4 text-center">
          <p className="text-2xl font-bold text-[--foreground]">{eintraege.length}</p>
          <p className="text-xs text-[--muted-foreground] mt-0.5">Einträge gesamt</p>
        </div>
        <div className="rounded-xl border border-[--border] p-4 text-center">
          <p className="text-2xl font-bold text-[--foreground]">
            {durchschnitt ? `${durchschnitt}` : "–"}
          </p>
          <p className="text-xs text-[--muted-foreground] mt-0.5">Ø Stimmung</p>
        </div>
        <div className="rounded-xl border border-[--border] p-4 text-center">
          <p className="text-2xl font-bold text-[--foreground]">
            {durchschnitt ? STIMMUNG_EMOJI[Math.round(parseFloat(durchschnitt))] : "–"}
          </p>
          <p className="text-xs text-[--muted-foreground] mt-0.5">Tendenz</p>
        </div>
      </div>

      {/* ── Stimmungs-Chart ─────────────────────────────────────────────── */}
      {hatChartDaten ? (
        <div className="rounded-xl border border-[--border] p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-[--muted-foreground]" />
            <h2 className="font-semibold text-sm">Stimmungsverlauf — letzte 30 Tage</h2>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={daten} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="stimmungGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="datum"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                interval={4}
              />
              <YAxis
                domain={[0, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<StimmungsTooltip />} />
              <Area
                type="monotone"
                dataKey="stimmung"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#stimmungGrad)"
                connectNulls={false}
                dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-between mt-3 px-1">
            {[1, 2, 3, 4, 5].map((w) => (
              <span key={w} className="text-xs text-[--muted-foreground]">
                {STIMMUNG_EMOJI[w]} {w}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[--border] p-8 text-center text-[--muted-foreground]">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Noch keine Stimmungs-Daten für den Chart.</p>
          <p className="text-xs mt-1 opacity-70">Erstelle Einträge mit Stimmungs-Wert, um den Verlauf zu sehen.</p>
        </div>
      )}

      {/* ── Neuer Eintrag ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Einträge</h2>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "outline" : "default"}
        >
          {showForm ? (
            <><X className="h-4 w-4 mr-1" /> Abbrechen</>
          ) : (
            <><Plus className="h-4 w-4 mr-1" /> Eintrag hinzufügen</>
          )}
        </Button>
      </div>

      {showForm && (
        <div className="border border-[--border] rounded-xl p-4 space-y-4 bg-[--muted]/30">
          <h3 className="font-medium text-sm">Neuer Tagebucheintrag</h3>

          <div>
            <label className="text-xs text-[--muted-foreground] mb-1 block">Datum</label>
            <Input
              type="date"
              value={form.eintrag_datum}
              onChange={(e) => setForm((f) => ({ ...f, eintrag_datum: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs text-[--muted-foreground] mb-2 block">Stimmung</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((wert) => (
                <button
                  key={wert}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      stimmung: f.stimmung === String(wert) ? "" : String(wert),
                    }))
                  }
                  aria-label={STIMMUNG_LABEL[wert]}
                  className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
                    form.stimmung === String(wert)
                      ? "border-[--primary] bg-[--primary]/10"
                      : "border-[--border] hover:border-[--primary]/50"
                  }`}
                >
                  <span className="text-2xl">{STIMMUNG_EMOJI[wert]}</span>
                  <span className="text-xs text-[--muted-foreground] mt-0.5">
                    {STIMMUNG_LABEL[wert].split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[--muted-foreground] mb-1 block">Schlaf (Stunden)</label>
              <Input
                type="number"
                min={0}
                max={24}
                step={0.5}
                placeholder="z.B. 7.5"
                value={form.schlaf_stunden}
                onChange={(e) => setForm((f) => ({ ...f, schlaf_stunden: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-[--muted-foreground] mb-1 block">Schmerzen (0–10)</label>
              <Input
                type="number"
                min={0}
                max={10}
                step={1}
                placeholder="0 = kein Schmerz"
                value={form.schmerzen}
                onChange={(e) => setForm((f) => ({ ...f, schmerzen: e.target.value }))}
              />
            </div>
          </div>

          <Textarea
            placeholder="Aktivitäten (optional)"
            value={form.aktivitaeten}
            onChange={(e) => setForm((f) => ({ ...f, aktivitaeten: e.target.value }))}
            rows={2}
          />
          <Textarea
            placeholder="Notizen und Beobachtungen"
            value={form.notizen}
            onChange={(e) => setForm((f) => ({ ...f, notizen: e.target.value }))}
            rows={3}
          />
          <Input
            placeholder="Erstellt von (optional)"
            value={form.erstellt_von}
            onChange={(e) => setForm((f) => ({ ...f, erstellt_von: e.target.value }))}
          />
          <Button onClick={erstellen} disabled={saving} size="sm" className="w-full">
            {saving ? "Speichern…" : "Eintrag speichern"}
          </Button>
        </div>
      )}

      {/* ── Timeline ────────────────────────────────────────────────────── */}
      {eintraege.length === 0 && !showForm ? (
        <div className="text-center py-16 text-[--muted-foreground]">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Noch keine Tagebucheinträge</p>
          <p className="text-xs mt-1 opacity-70">
            Erfasse täglich Stimmung, Schlaf und Wohlbefinden.
          </p>
          <Button className="mt-4" size="sm" onClick={() => setShowForm(true)}>
            Ersten Eintrag erstellen
          </Button>
        </div>
      ) : (
        <div className="relative space-y-0">
          {eintraege.map((eintrag, index) => (
            <div key={eintrag.id} className="flex gap-4 relative">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-[--primary] shrink-0 mt-4 z-10" />
                {index < eintraege.length - 1 && (
                  <div className="w-px flex-1 bg-[--border] mt-1" />
                )}
              </div>

              <div className="flex-1 pb-4">
                <div className="border border-[--border] rounded-xl p-3 bg-[--background]">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-medium text-sm text-[--foreground]">
                        {formatDatumLang(eintrag.eintrag_datum)}
                      </p>
                      {eintrag.erstellt_von && (
                        <p className="text-xs text-[--muted-foreground]">
                          von {eintrag.erstellt_von}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => loeschen(eintrag.id)}
                      aria-label="Eintrag löschen"
                      className="text-[--muted-foreground] hover:text-red-600 transition-colors shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-2">
                    {eintrag.stimmung !== null && (
                      <div className="flex items-center gap-1">
                        <span className="text-xl">{STIMMUNG_EMOJI[eintrag.stimmung]}</span>
                        <span className="text-xs text-[--muted-foreground]">
                          {STIMMUNG_LABEL[eintrag.stimmung]}
                        </span>
                      </div>
                    )}
                    {eintrag.schlaf_stunden !== null && (
                      <div className="flex items-center gap-1 text-xs text-[--muted-foreground]">
                        <Moon className="h-3.5 w-3.5" />
                        {eintrag.schlaf_stunden}h Schlaf
                      </div>
                    )}
                    {eintrag.schmerzen !== null && (
                      <div className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-[--muted-foreground]" />
                        <SchmerzBalken wert={eintrag.schmerzen} />
                      </div>
                    )}
                  </div>

                  {eintrag.aktivitaeten && (
                    <p className="text-xs text-[--muted-foreground] mb-1">
                      <span className="font-medium">Aktivitäten:</span> {eintrag.aktivitaeten}
                    </p>
                  )}
                  {eintrag.notizen && (
                    <p className="text-sm text-[--foreground] whitespace-pre-wrap">
                      {eintrag.notizen}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Calendar, Clock, Plus, X, ChevronLeft, ChevronRight,
  Download, CheckCircle2, XCircle, Loader2, User, AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  geplant:       { label: "Geplant",       color: "bg-yellow-100 text-yellow-800" },
  bestaetigt:    { label: "Bestätigt",     color: "bg-green-100 text-green-800" },
  abgesagt:      { label: "Abgesagt",      color: "bg-red-100 text-red-800" },
  abgeschlossen: { label: "Abgeschlossen", color: "bg-gray-100 text-gray-700" },
};

const TYP_CFG: Record<string, { label: string; dot: string }> = {
  standard:      { label: "Standard",       dot: "bg-blue-400" },
  nacht:         { label: "Nachtschicht",   dot: "bg-indigo-400" },
  bereitschaft:  { label: "Bereitschaft",   dot: "bg-orange-400" },
  springerdienst:{ label: "Springerdienst", dot: "bg-purple-400" },
};

type Schicht = {
  id: string;
  start_ts: string;
  ende_ts: string;
  titel?: string | null;
  beschreibung?: string | null;
  schichttyp: string;
  status: string;
  stunden_geplant?: number | null;
  stundensatz_ct?: number | null;
  care_worker_id: string;
  familie_profile_id?: string | null;
  care_workers?: { vorname: string; nachname: string; stundensatz_ct?: number } | null;
  profiles?: { vorname?: string; nachname?: string } | null;
};

type CareWorker = { id: string; vorname: string; nachname: string; stundensatz_ct?: number };
type FamilieOption = { id: string; vorname?: string; nachname?: string };

interface Props {
  initialSchichten: Schicht[];
  careWorkers: CareWorker[];
  familieOptionen: FamilieOption[];
  anbieterName: string;
}

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d: Date) { const r = new Date(d); r.setDate(r.getDate() - r.getDay() + 1); r.setHours(0,0,0,0); return r; }
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function SchichtplanClient({ initialSchichten, careWorkers, familieOptionen, anbieterName }: Props) {
  const router = useRouter();
  const [schichten, setSchichten] = useState<Schicht[]>(initialSchichten);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [filterWorker, setFilterWorker] = useState("");

  // Form state
  const [form, setForm] = useState({
    care_worker_id: careWorkers[0]?.id ?? "",
    familie_profile_id: "",
    start_ts: "",
    ende_ts: "",
    titel: "",
    schichttyp: "standard",
  });
  const [formLoading, setFormLoading] = useState(false);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const filteredSchichten = useMemo(() => {
    if (!filterWorker) return schichten;
    return schichten.filter(s => s.care_worker_id === filterWorker);
  }, [schichten, filterWorker]);

  const schichtenByDay = useMemo(() => {
    const map: Record<string, Schicht[]> = {};
    for (const s of filteredSchichten) {
      const key = new Date(s.start_ts).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [filteredSchichten]);

  const kpis = useMemo(() => {
    const weekSchichten = filteredSchichten.filter(s => {
      const d = new Date(s.start_ts);
      return d >= weekStart && d < addDays(weekStart, 7);
    });
    return {
      anzahl: weekSchichten.length,
      stunden: weekSchichten.reduce((sum, s) => sum + (Number(s.stunden_geplant) || 0), 0),
      bestaetigt: weekSchichten.filter(s => s.status === "bestaetigt").length,
      offen: weekSchichten.filter(s => s.status === "geplant").length,
    };
  }, [filteredSchichten, weekStart]);

  const handleStatusChange = async (id: string, status: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/schichten/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Fehler");
      setSchichten(prev => prev.map(s => s.id === id ? { ...s, status } : s));
      toast.success(`Schicht ${status === "bestaetigt" ? "bestätigt" : "abgesagt"}`);
    } catch {
      toast.error("Aktualisierung fehlgeschlagen");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Schicht löschen?")) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/schichten/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
      setSchichten(prev => prev.filter(s => s.id !== id));
      toast.success("Schicht gelöscht");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreate = async () => {
    if (!form.care_worker_id || !form.start_ts || !form.ende_ts) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }
    setFormLoading(true);
    try {
      const res = await fetch("/api/schichten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          familie_profile_id: form.familie_profile_id || undefined,
          titel: form.titel || undefined,
          start_ts: new Date(form.start_ts).toISOString(),
          ende_ts: new Date(form.ende_ts).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");

      // Enrich with care_worker data
      const worker = careWorkers.find(w => w.id === form.care_worker_id);
      const familie = familieOptionen.find(f => f.id === form.familie_profile_id);
      const enriched: Schicht = {
        ...data,
        care_workers: worker ? { vorname: worker.vorname, nachname: worker.nachname } : null,
        profiles: familie ? { vorname: familie.vorname, nachname: familie.nachname } : null,
      };
      setSchichten(prev => [...prev, enriched]);
      toast.success("Schicht angelegt");
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Anlegen");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    const dateStr = day.toISOString().slice(0, 10);
    setForm(f => ({
      ...f,
      start_ts: `${dateStr}T08:00`,
      ende_ts: `${dateStr}T14:00`,
    }));
    setShowForm(true);
  };

  const handleIcalExport = () => {
    const params = filterWorker ? `?care_worker_id=${filterWorker}` : "";
    window.open(`/api/schichten/ical${params}`, "_blank");
  };

  const weekLabel = `${weekDays[0].toLocaleDateString("de-DE", { day: "2-digit", month: "short" })} – ${weekDays[6].toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schichtplanung</h1>
          <p className="text-sm text-gray-500 mt-1">Wochenansicht — {anbieterName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleIcalExport} className="gap-2 text-sm">
            <Download className="h-4 w-4" /> iCal exportieren
          </Button>
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="h-4 w-4" /> Neue Schicht
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Schichten diese Woche</p>
          <p className="text-2xl font-bold text-gray-900">{kpis.anzahl}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Geplante Stunden</p>
          <p className="text-2xl font-bold text-blue-600">{kpis.stunden.toFixed(1)}h</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Bestätigt</p>
          <p className="text-2xl font-bold text-green-600">{kpis.bestaetigt}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Ausstehend</p>
          <p className="text-2xl font-bold text-yellow-600">{kpis.offen}</p>
        </Card>
      </div>

      {/* Neues Schicht-Formular */}
      {showForm && (
        <Card className="p-5 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Neue Schicht anlegen</h3>
            <button onClick={() => setShowForm(false)} aria-label="Schließen">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pflegekraft *</label>
              <select
                value={form.care_worker_id}
                onChange={e => setForm(f => ({ ...f, care_worker_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {careWorkers.map(w => (
                  <option key={w.id} value={w.id}>{w.vorname} {w.nachname}</option>
                ))}
              </select>
            </div>
            {familieOptionen.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pflegeperson</label>
                <select
                  value={form.familie_profile_id}
                  onChange={e => setForm(f => ({ ...f, familie_profile_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— keine Zuordnung —</option>
                  {familieOptionen.map(fam => (
                    <option key={fam.id} value={fam.id}>{fam.vorname} {fam.nachname}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Beginn *</label>
              <input
                type="datetime-local"
                value={form.start_ts}
                onChange={e => setForm(f => ({ ...f, start_ts: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ende *</label>
              <input
                type="datetime-local"
                value={form.ende_ts}
                onChange={e => setForm(f => ({ ...f, ende_ts: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Titel (optional)</label>
              <input
                type="text"
                placeholder="z.B. Morgenrunde"
                value={form.titel}
                onChange={e => setForm(f => ({ ...f, titel: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Schichttyp</label>
              <select
                value={form.schichttyp}
                onChange={e => setForm(f => ({ ...f, schichttyp: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(TYP_CFG).map(([v, { label }]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Abbrechen</Button>
            <Button onClick={handleCreate} disabled={formLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {formLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Anlegen
            </Button>
          </div>
        </Card>
      )}

      {/* Wochennavigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekStart(w => addDays(w, -7))}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ChevronLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="font-medium text-gray-800">{weekLabel}</span>
          {careWorkers.length > 1 && (
            <select
              value={filterWorker}
              onChange={e => setFilterWorker(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none"
            >
              <option value="">Alle Pflegekräfte</option>
              {careWorkers.map(w => (
                <option key={w.id} value={w.id}>{w.vorname} {w.nachname}</option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={() => setWeekStart(w => addDays(w, 7))}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ChevronRight className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Wochenkalender */}
      <div className="grid grid-cols-7 gap-1">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d, i) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 pb-1">
            <span>{d}</span>
            <span className={`block text-sm font-bold mt-0.5 ${isSameDay(weekDays[i], new Date()) ? "text-blue-600" : "text-gray-700"}`}>
              {weekDays[i].getDate()}
            </span>
          </div>
        ))}
        {weekDays.map((day, i) => {
          const daySchichten = schichtenByDay[day.toDateString()] ?? [];
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={i}
              onClick={() => handleDayClick(day)}
              className={`min-h-[120px] rounded-lg p-1.5 cursor-pointer transition-colors ${
                isToday ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border border-gray-100 hover:bg-gray-100"
              }`}
            >
              {daySchichten.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-300">
                  <Plus className="h-4 w-4" />
                </div>
              )}
              {daySchichten.map(s => {
                const typCfg = TYP_CFG[s.schichttyp] ?? TYP_CFG.standard;
                const statCfg = STATUS_CFG[s.status] ?? STATUS_CFG.geplant;
                const start = new Date(s.start_ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
                const ende = new Date(s.ende_ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div
                    key={s.id}
                    className="mb-1 p-1.5 rounded bg-white border border-gray-200 shadow-sm text-xs"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${typCfg.dot}`} />
                      <span className="font-medium text-gray-800 truncate">
                        {s.care_workers ? `${s.care_workers.vorname} ${s.care_workers.nachname[0]}.` : "–"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{start}–{ende}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statCfg.color}`}>
                        {statCfg.label}
                      </span>
                      {s.status === "geplant" && (
                        <div className="ml-auto flex gap-0.5">
                          <button
                            onClick={() => handleStatusChange(s.id, "bestaetigt")}
                            disabled={loadingId === s.id}
                            className="p-0.5 hover:text-green-600"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(s.id, "abgesagt")}
                            disabled={loadingId === s.id}
                            className="p-0.5 hover:text-red-500"
                          >
                            <XCircle className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            disabled={loadingId === s.id}
                            className="p-0.5 hover:text-gray-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

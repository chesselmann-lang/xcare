"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import {
  Clock, Plus, Trash2, CheckCircle2, Download, X, Loader2, Timer, Calendar
} from "lucide-react";
import { toast } from "sonner";

interface ArbeitszeitEintrag {
  id: string;
  datum: string;
  beginn: string;
  ende: string | null;
  pause_min: number;
  taetigkeit: string;
  kategorie: "pflege" | "hauswirtschaft" | "begleitung" | "verwaltung" | "sonstiges";
  status: "offen" | "bestaetigt" | "abgerechnet";
  notiz: string | null;
  created_at: string;
  care_worker_id: string | null;
}

interface Worker { id: string; vorname: string; nachname: string; }

interface Props {
  eintraege: ArbeitszeitEintrag[];
  workers: Worker[];
  gesamtMinuten: number;
  initialVon: string;
  initialBis: string;
  initialWorker?: string;
}

const KAT_COLORS: Record<ArbeitszeitEintrag["kategorie"], string> = {
  pflege:         "bg-blue-100 text-blue-700",
  hauswirtschaft: "bg-green-100 text-green-700",
  begleitung:     "bg-purple-100 text-purple-700",
  verwaltung:     "bg-gray-100 text-gray-700",
  sonstiges:      "bg-orange-100 text-orange-700",
};

const STATUS_COLORS: Record<ArbeitszeitEintrag["status"], string> = {
  offen:       "bg-yellow-100 text-yellow-700",
  bestaetigt:  "bg-green-100 text-green-700",
  abgerechnet: "bg-blue-100 text-blue-700",
};

function calcMinutes(e: ArbeitszeitEintrag): number {
  if (!e.ende) return 0;
  const [bh, bm] = e.beginn.split(":").map(Number);
  const [eh, em] = e.ende.split(":").map(Number);
  return Math.max(0, (eh * 60 + em) - (bh * 60 + bm) - (e.pause_min ?? 0));
}

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

const EMPTY_FORM = {
  datum: new Date().toISOString().slice(0, 10),
  beginn: "08:00",
  ende: "16:00",
  pause_min: 30,
  taetigkeit: "",
  kategorie: "pflege" as ArbeitszeitEintrag["kategorie"],
  notiz: "",
};

export default function ArbeitszeitClient({
  eintraege: initial, workers, gesamtMinuten: initialGesamt, initialVon, initialBis, initialWorker
}: Props) {
  const router = useRouter();
  const [eintraege, setEintraege] = useState<ArbeitszeitEintrag[]>(initial);
  const [gesamtMin, setGesamtMin] = useState(initialGesamt);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [von, setVon] = useState(initialVon);
  const [bis, setBis] = useState(initialBis);
  const [workerFilter, setWorkerFilter] = useState(initialWorker ?? "");
  const [, startTransition] = useTransition();

  function applyFilter() {
    const params = new URLSearchParams();
    params.set("von", von);
    params.set("bis", bis);
    if (workerFilter) params.set("worker", workerFilter);
    router.push(`/anbieter/arbeitszeit?${params.toString()}`);
  }

  async function handleCreate() {
    if (!form.taetigkeit.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/arbeitszeit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, pause_min: Number(form.pause_min) }),
      });
      if (!res.ok) throw new Error(await res.text());
      const entry: ArbeitszeitEintrag = await res.json();
      setEintraege((prev) => [entry, ...prev]);
      setGesamtMin((m) => m + calcMinutes(entry));
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success("Eintrag erstellt");
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: ArbeitszeitEintrag["status"]) {
    const prev = eintraege.find((e) => e.id === id);
    startTransition(() => {
      setEintraege((list) => list.map((e) => e.id === id ? { ...e, status } : e));
    });
    const res = await fetch(`/api/arbeitszeit/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok && prev) {
      setEintraege((list) => list.map((e) => e.id === id ? prev : e));
      toast.error("Fehler beim Aktualisieren");
    } else {
      toast.success("Status aktualisiert");
    }
  }

  async function handleDelete(id: string) {
    const entry = eintraege.find((e) => e.id === id);
    startTransition(() => { setEintraege((list) => list.filter((e) => e.id !== id)); });
    if (entry) setGesamtMin((m) => m - calcMinutes(entry));
    const res = await fetch(`/api/arbeitszeit/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Fehler beim Löschen");
      if (entry) {
        setEintraege((list) => [entry, ...list]);
        setGesamtMin((m) => m + calcMinutes(entry));
      }
    } else {
      toast.success("Eintrag gelöscht");
    }
  }

  function handleCsvExport() {
    const header = "Datum,Beginn,Ende,Pause(min),Netto(h),Tätigkeit,Kategorie,Status,Notiz";
    const rows = eintraege.map((e) => {
      const netto = (calcMinutes(e) / 60).toFixed(2);
      return [e.datum, e.beginn, e.ende ?? "", e.pause_min, netto,
        `"${e.taetigkeit.replace(/"/g, '""')}"`,
        e.kategorie, e.status,
        `"${(e.notiz ?? "").replace(/"/g, '""')}"`].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arbeitszeit_${von}_${bis}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const gesamtH = Math.floor(gesamtMin / 60);
  const gesamtM = gesamtMin % 60;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[--card] border border-[--border] rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs text-[--muted-foreground] mb-1">
            <Timer size={13} /> Gesamtstunden
          </div>
          <p className="text-2xl font-bold text-[--foreground]">
            {gesamtH}h{gesamtM > 0 ? ` ${gesamtM}m` : ""}
          </p>
        </div>
        <div className="bg-[--card] border border-[--border] rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs text-[--muted-foreground] mb-1">
            <Clock size={13} /> Einträge
          </div>
          <p className="text-2xl font-bold text-[--foreground]">{eintraege.length}</p>
        </div>
        <div className="bg-[--card] border border-[--border] rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs text-[--muted-foreground] mb-1">
            <CheckCircle2 size={13} /> Bestätigt
          </div>
          <p className="text-2xl font-bold text-green-600">
            {eintraege.filter((e) => e.status === "bestaetigt").length}
          </p>
        </div>
        <div className="bg-[--card] border border-[--border] rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs text-[--muted-foreground] mb-1">
            <Calendar size={13} /> Zeitraum
          </div>
          <p className="text-sm font-semibold text-[--foreground] truncate">
            {format(parseISO(von), "dd.MM.", { locale: de })} – {format(parseISO(bis), "dd.MM.yy", { locale: de })}
          </p>
        </div>
      </div>

      {/* Filter + Actions bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[--muted-foreground]">Von</label>
          <input type="date" value={von} onChange={(e) => setVon(e.target.value)}
            className="border border-[--border] rounded-lg px-3 py-1.5 text-sm bg-[--card] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/40" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[--muted-foreground]">Bis</label>
          <input type="date" value={bis} onChange={(e) => setBis(e.target.value)}
            className="border border-[--border] rounded-lg px-3 py-1.5 text-sm bg-[--card] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/40" />
        </div>
        {workers.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[--muted-foreground]">Mitarbeiter</label>
            <select value={workerFilter} onChange={(e) => setWorkerFilter(e.target.value)}
              className="border border-[--border] rounded-lg px-3 py-1.5 text-sm bg-[--card] text-[--foreground] focus:outline-none">
              <option value="">Alle</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>{w.vorname} {w.nachname}</option>
              ))}
            </select>
          </div>
        )}
        <button onClick={applyFilter}
          className="px-4 py-1.5 bg-[--primary] text-white rounded-lg text-sm font-medium hover:opacity-90">
          Filtern
        </button>
        <div className="ml-auto flex gap-2">
          <button onClick={handleCsvExport}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[--border] rounded-lg text-sm text-[--muted-foreground] hover:bg-[--muted]">
            <Download size={14} /> CSV
          </button>
          <button onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[--primary] text-white rounded-lg text-sm font-medium hover:opacity-90">
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Abbrechen" : "Neuer Eintrag"}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-[--card] border border-[--border] rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-[--foreground] mb-4">Neue Arbeitszeit erfassen</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
              <label className="text-xs text-[--muted-foreground]">Datum</label>
              <input type="date" value={form.datum} onChange={(e) => setForm((f) => ({ ...f, datum: e.target.value }))}
                className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[--muted-foreground]">Beginn</label>
              <input type="time" value={form.beginn} onChange={(e) => setForm((f) => ({ ...f, beginn: e.target.value }))}
                className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[--muted-foreground]">Ende</label>
              <input type="time" value={form.ende} onChange={(e) => setForm((f) => ({ ...f, ende: e.target.value }))}
                className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[--muted-foreground]">Pause (min)</label>
              <input type="number" min={0} max={480} value={form.pause_min} onChange={(e) => setForm((f) => ({ ...f, pause_min: parseInt(e.target.value) || 0 }))}
                className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/40" />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs text-[--muted-foreground]">Tätigkeit</label>
              <input type="text" value={form.taetigkeit} placeholder="z.B. Körperpflege, Medikamentengabe…"
                onChange={(e) => setForm((f) => ({ ...f, taetigkeit: e.target.value }))}
                className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[--muted-foreground]">Kategorie</label>
              <select value={form.kategorie} onChange={(e) => setForm((f) => ({ ...f, kategorie: e.target.value as ArbeitszeitEintrag["kategorie"] }))}
                className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] text-[--foreground] focus:outline-none">
                <option value="pflege">Pflege</option>
                <option value="hauswirtschaft">Hauswirtschaft</option>
                <option value="begleitung">Begleitung</option>
                <option value="verwaltung">Verwaltung</option>
                <option value="sonstiges">Sonstiges</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-4 flex flex-col gap-1">
              <label className="text-xs text-[--muted-foreground]">Notiz (optional)</label>
              <input type="text" value={form.notiz} placeholder="Optionale Anmerkung…"
                onChange={(e) => setForm((f) => ({ ...f, notiz: e.target.value }))}
                className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/40" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleCreate} disabled={saving || !form.taetigkeit.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-[--primary] text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving && <Loader2 size={14} className="animate-spin" />}
              Erfassen
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-5 py-2 bg-[--muted] text-[--muted-foreground] rounded-xl text-sm hover:bg-[--border]">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {eintraege.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[--muted] flex items-center justify-center mb-4">
            <Clock size={28} className="text-[--muted-foreground]" />
          </div>
          <p className="text-[--foreground] font-medium">Keine Einträge im Zeitraum</p>
          <p className="text-sm text-[--muted-foreground] mt-1">Erfassen Sie Ihre ersten Arbeitsstunden.</p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-[--primary] text-white rounded-xl text-sm font-medium hover:opacity-90">
            <Plus size={15} /> Ersten Eintrag erstellen
          </button>
        </div>
      ) : (
        <div className="bg-[--card] border border-[--border] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[--border] text-xs text-[--muted-foreground] uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Datum</th>
                  <th className="px-4 py-3 text-left">Zeit</th>
                  <th className="px-4 py-3 text-left">Netto</th>
                  <th className="px-4 py-3 text-left">Tätigkeit</th>
                  <th className="px-4 py-3 text-left">Kategorie</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border]">
                {eintraege.map((e) => {
                  const netto = calcMinutes(e);
                  return (
                    <tr key={e.id} className="hover:bg-[--muted]/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-[--foreground]">
                        {format(parseISO(e.datum), "dd.MM.yy", { locale: de })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[--muted-foreground] tabular-nums">
                        {e.beginn.slice(0, 5)} – {e.ende ? e.ende.slice(0, 5) : "—"}
                        {e.pause_min > 0 && <span className="text-xs ml-1">(P: {e.pause_min}m)</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-[--foreground] tabular-nums">
                        {netto > 0 ? fmtDuration(netto) : "—"}
                      </td>
                      <td className="px-4 py-3 text-[--foreground] max-w-[200px] truncate">
                        {e.taetigkeit}
                        {e.notiz && <span className="text-xs text-[--muted-foreground] ml-1">· {e.notiz}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${KAT_COLORS[e.kategorie]}`}>
                          {e.kategorie}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={e.status}
                          onChange={(ev) => handleStatusChange(e.id, ev.target.value as ArbeitszeitEintrag["status"])}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 focus:outline-none cursor-pointer ${STATUS_COLORS[e.status]}`}
                        >
                          <option value="offen">Offen</option>
                          <option value="bestaetigt">Bestätigt</option>
                          <option value="abgerechnet">Abgerechnet</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDelete(e.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-[--muted-foreground] hover:text-red-600 transition-colors"
                          title="Löschen" aria-label="Eintrag löschen">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-[--border] bg-[--muted]/30">
                  <td colSpan={2} className="px-4 py-3 text-xs text-[--muted-foreground] font-medium">
                    Gesamt ({eintraege.length} Einträge)
                  </td>
                  <td className="px-4 py-3 font-bold text-[--foreground]">
                    {fmtDuration(gesamtMin)}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

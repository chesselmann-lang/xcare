"use client";
import { useState } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import { Award, Plus, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface CareWorker {
  id: string;
  vorname: string;
  nachname: string;
}

interface Zertifikat {
  id: string;
  care_worker_id?: string;
  zertifikat_name: string;
  ausstellende_stelle?: string | null;
  ausstellungsdatum?: string | null;
  ablaufdatum?: string | null;
  zertifikat_nummer?: string | null;
  notizen?: string | null;
  created_at: string;
  care_workers?: { id: string; vorname: string; nachname: string } | null;
}

interface Props {
  zertifikate: Zertifikat[];
  careWorkers: CareWorker[];
}

function getStatus(ablauf: string | null | undefined): { label: string; color: string; icon: typeof CheckCircle } {
  if (!ablauf) return { label: "Kein Ablauf", color: "bg-gray-100 text-gray-600", icon: Clock };
  const days = differenceInDays(parseISO(ablauf), new Date());
  if (days < 0) return { label: "Abgelaufen", color: "bg-red-100 text-red-700", icon: AlertTriangle };
  if (days <= 30) return { label: `${days}d verbleibend`, color: "bg-red-100 text-red-700", icon: AlertTriangle };
  if (days <= 90) return { label: `${days}d verbleibend`, color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle };
  return { label: "Gültig", color: "bg-green-100 text-green-700", icon: CheckCircle };
}

export default function ZertifikateClient({ zertifikate: initial, careWorkers }: Props) {
  const [zertifikate, setZertifikate] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [filterWorker, setFilterWorker] = useState("");
  const [filterStatus, setFilterStatus] = useState<"alle" | "ablaufend" | "abgelaufen">("alle");

  const [form, setForm] = useState({
    care_worker_id: "",
    zertifikat_name: "",
    ausstellende_stelle: "",
    ausstellungsdatum: "",
    ablaufdatum: "",
    zertifikat_nummer: "",
    notizen: "",
  });

  async function handleSubmit() {
    if (!form.care_worker_id || !form.zertifikat_name) return;
    setSaving(true);
    setMsg(null);
    try {
      const body = {
        ...form,
        ausstellungsdatum: form.ausstellungsdatum || undefined,
        ablaufdatum: form.ablaufdatum || undefined,
      };
      const res = await fetch("/api/zertifikate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const entry = await res.json();
      const worker = careWorkers.find((w) => w.id === form.care_worker_id);
      setZertifikate((prev) => [{ ...entry, care_workers: worker ?? null }, ...prev]);
      setForm({ care_worker_id: "", zertifikat_name: "", ausstellende_stelle: "", ausstellungsdatum: "", ablaufdatum: "", zertifikat_nummer: "", notizen: "" });
      setShowForm(false);
      setMsg("✓ Zertifikat gespeichert");
    } catch {
      setMsg("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  const displayed = zertifikate.filter((z) => {
    if (filterWorker && !z.care_workers?.id.includes(filterWorker) && z.care_worker_id !== filterWorker) return false;
    if (filterStatus === "ablaufend") {
      if (!z.ablaufdatum) return false;
      const days = differenceInDays(parseISO(z.ablaufdatum), new Date());
      return days >= 0 && days <= 90;
    }
    if (filterStatus === "abgelaufen") {
      if (!z.ablaufdatum) return false;
      return differenceInDays(parseISO(z.ablaufdatum), new Date()) < 0;
    }
    return true;
  });

  const abgelaufenCount = zertifikate.filter((z) => z.ablaufdatum && differenceInDays(parseISO(z.ablaufdatum), new Date()) < 0).length;
  const ablaufendCount = zertifikate.filter((z) => {
    if (!z.ablaufdatum) return false;
    const d = differenceInDays(parseISO(z.ablaufdatum), new Date());
    return d >= 0 && d <= 90;
  }).length;

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      {(abgelaufenCount > 0 || ablaufendCount > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-yellow-800">
            {abgelaufenCount > 0 && <strong>{abgelaufenCount} Zertifikat{abgelaufenCount > 1 ? "e" : ""} abgelaufen.</strong>}
            {ablaufendCount > 0 && <span className="ml-1">{ablaufendCount} laufen in 90 Tagen ab.</span>}
          </div>
        </div>
      )}

      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {careWorkers.length > 0 && (
            <select value={filterWorker} onChange={(e) => setFilterWorker(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Alle Mitarbeiter</option>
              {careWorkers.map((w) => (
                <option key={w.id} value={w.id}>{w.vorname} {w.nachname}</option>
              ))}
            </select>
          )}
          <div className="flex gap-1">
            {(["alle", "ablaufend", "abgelaufen"] as const).map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-2 rounded-lg text-xs font-medium ${filterStatus === s ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} /> Zertifikat hinzufügen
        </button>
      </div>

      {msg && (
        <div className={`text-sm px-4 py-2 rounded-lg ${msg.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {msg}
        </div>
      )}

      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Neues Zertifikat</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Mitarbeiter *</label>
              <select value={form.care_worker_id} onChange={(e) => setForm((f) => ({ ...f, care_worker_id: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">— wählen</option>
                {careWorkers.map((w) => <option key={w.id} value={w.id}>{w.vorname} {w.nachname}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Zertifikat *</label>
              <input type="text" value={form.zertifikat_name} onChange={(e) => setForm((f) => ({ ...f, zertifikat_name: e.target.value }))}
                placeholder="z.B. Erste Hilfe, Hygiene..." className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Ausstellende Stelle</label>
              <input type="text" value={form.ausstellende_stelle} onChange={(e) => setForm((f) => ({ ...f, ausstellende_stelle: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Zertifikatsnummer</label>
              <input type="text" value={form.zertifikat_nummer} onChange={(e) => setForm((f) => ({ ...f, zertifikat_nummer: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Ausstellungsdatum</label>
              <input type="date" value={form.ausstellungsdatum} onChange={(e) => setForm((f) => ({ ...f, ausstellungsdatum: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Ablaufdatum</label>
              <input type="date" value={form.ablaufdatum} onChange={(e) => setForm((f) => ({ ...f, ablaufdatum: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600">Notizen</label>
              <textarea rows={2} value={form.notizen} onChange={(e) => setForm((f) => ({ ...f, notizen: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} disabled={saving || !form.care_worker_id || !form.zertifikat_name}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? "…" : "Speichern"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          Keine Zertifikate vorhanden
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((z) => {
            const status = getStatus(z.ablaufdatum);
            const StatusIcon = status.icon;
            return (
              <div key={z.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                      <Award size={18} className="text-purple-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{z.zertifikat_name}</div>
                      {z.care_workers && (
                        <div className="text-sm text-gray-500">
                          {z.care_workers.vorname} {z.care_workers.nachname}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium shrink-0 ${status.color}`}>
                    <StatusIcon size={10} /> {status.label}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  {z.ausstellende_stelle && <span>Ausgestellt von: {z.ausstellende_stelle}</span>}
                  {z.zertifikat_nummer && <span>Nr.: {z.zertifikat_nummer}</span>}
                  {z.ausstellungsdatum && <span>Ausgestellt: {format(parseISO(z.ausstellungsdatum), "dd.MM.yyyy", { locale: de })}</span>}
                  {z.ablaufdatum && <span>Ablauf: {format(parseISO(z.ablaufdatum), "dd.MM.yyyy", { locale: de })}</span>}
                </div>
                {z.notizen && <div className="mt-2 text-xs text-gray-500 italic">{z.notizen}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

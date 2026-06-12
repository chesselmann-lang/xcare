"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  MapPin, Plus, Search, Route, Clock, User,
  ChevronDown, ChevronUp, Car, Edit2, Trash2, X,
  AlertTriangle, CheckCircle2, Circle, Navigation
} from "lucide-react";

type Einsatz = {
  id: string;
  kunde_name: string;
  kunde_adresse: string;
  geplante_ankunft: string;
  geplante_abfahrt: string;
  status: string;
  prioritaet: string;
  reihenfolge: number;
  leistungsart?: string;
  leistungsminuten?: number;
};

type Tour = {
  id: string;
  datum: string;
  name: string;
  fahrzeug?: string;
  status: string;
  start_ort?: string;
  end_ort?: string;
  geplante_km?: number;
  notizen?: string;
  created_at: string;
  fahrer?: { vorname: string; nachname: string } | null;
  tour_einsaetze?: Einsatz[];
};

type TeamMember = {
  profile_id: string;
  name: string;
};

type Props = {
  initialTouren: Tour[];
  team: TeamMember[];
  today: string;
};

const STATUS_TOUR: Record<string, { label: string; color: string }> = {
  geplant: { label: "Geplant", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  aktiv: { label: "Aktiv", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  abgeschlossen: { label: "Abgeschlossen", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
  storniert: { label: "Storniert", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
};

const STATUS_EINSATZ: Record<string, { label: string; icon: React.FC<{ className?: string }> }> = {
  geplant: { label: "Geplant", icon: Circle },
  angekommen: { label: "Angekommen", icon: Navigation },
  abgeschlossen: { label: "Abgeschlossen", icon: CheckCircle2 },
  nicht_angetroffen: { label: "Nicht angetroffen", icon: AlertTriangle },
  storniert: { label: "Storniert", icon: X },
};

const PRIO_COLOR: Record<string, string> = {
  normal: "",
  hoch: "border-l-4 border-l-orange-400",
  dringend: "border-l-4 border-l-red-500",
};

const EMPTY_TOUR = {
  datum: new Date().toISOString().split("T")[0],
  name: "",
  fahrer_id: "",
  fahrzeug: "",
  start_ort: "",
  end_ort: "",
  geplante_km: "",
  notizen: "",
};

export function TourenClient({ initialTouren, team, today }: Props) {
  const [touren, setTouren] = useState<Tour[]>(initialTouren);
  const [filterDatum, setFilterDatum] = useState(today);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_TOUR>({ ...EMPTY_TOUR });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [updatingEinsatz, setUpdatingEinsatz] = useState<string | null>(null);

  const filtered = touren.filter((t) => {
    if (filterDatum && t.datum !== filterDatum) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) ||
        (t.fahrer?.nachname ?? "").toLowerCase().includes(q) ||
        (t.fahrzeug ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const openNew = () => {
    setForm({ ...EMPTY_TOUR, datum: filterDatum || today });
    setEditId(null);
    setShowForm(true);
  };

  const handleSave = useCallback(async () => {
    if (!form.name || !form.datum) {
      toast.error("Name und Datum sind Pflichtfelder");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        fahrer_id: form.fahrer_id || undefined,
        geplante_km: form.geplante_km ? parseFloat(form.geplante_km) : undefined,
      };
      const url = editId ? `/api/touren/${editId}` : "/api/touren";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved: Tour = await res.json();
      if (editId) {
        setTouren((prev) => prev.map((t) => (t.id === editId ? { ...t, ...saved } : t)));
        toast.success("Tour aktualisiert");
      } else {
        setTouren((prev) => [{ ...saved, tour_einsaetze: [] }, ...prev]);
        toast.success("Tour erstellt");
      }
      setShowForm(false);
      setEditId(null);
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }, [form, editId]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/touren/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTouren((prev) => prev.filter((t) => t.id !== id));
      toast.success("Tour gelöscht");
    } catch {
      toast.error("Fehler beim Löschen");
    } finally {
      setDeleteId(null);
    }
  };

  const handleStatusChange = async (tourId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/touren/${tourId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setTouren((prev) => prev.map((t) => (t.id === tourId ? { ...t, status: newStatus } : t)));
      toast.success("Status aktualisiert");
    } catch {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const handleEinsatzStatus = async (tourId: string, einsatzId: string, newStatus: string) => {
    setUpdatingEinsatz(einsatzId);
    try {
      const res = await fetch(`/api/touren/${tourId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ einsatz_id: einsatzId, status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setTouren((prev) => prev.map((t) => {
        if (t.id !== tourId) return t;
        return {
          ...t,
          tour_einsaetze: t.tour_einsaetze?.map((e) =>
            e.id === einsatzId ? { ...e, status: newStatus } : e
          ),
        };
      }));
    } catch {
      toast.error("Fehler beim Aktualisieren");
    } finally {
      setUpdatingEinsatz(null);
    }
  };

  const inputCls = "w-full rounded-lg border border-[--border] bg-[--card] px-3 py-2 text-sm focus:ring-2 focus:ring-[--primary] outline-none";
  const selectCls = inputCls;

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(STATUS_TOUR).map(([s, { label }]) => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
            className={`rounded-xl border p-4 text-left transition-all ${filterStatus === s ? "border-[--primary] bg-[--primary]/5" : "border-[--border] bg-[--card] hover:border-[--primary]/50"}`}
          >
            <p className="text-2xl font-bold">{touren.filter((t) => t.status === s).length}</p>
            <p className="text-xs text-[--muted-foreground] mt-1">{label}</p>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="date"
          value={filterDatum}
          onChange={(e) => setFilterDatum(e.target.value)}
          className={`${inputCls} w-auto`}
        />
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--muted-foreground]" />
          <input
            placeholder="Tour, Fahrer, Fahrzeug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} pl-9`}
          />
        </div>
        <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-[--primary] text-white px-4 py-2 text-sm font-medium hover:opacity-90 shrink-0">
          <Plus className="w-4 h-4" />
          Neue Tour
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[--card] border border-[--border] rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-[--border]">
              <h3 className="font-semibold text-lg">{editId ? "Tour bearbeiten" : "Neue Tour"}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Tourname *</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Tour Nord-West" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Datum *</label>
                  <input type="date" value={form.datum} onChange={(e) => setForm((f) => ({ ...f, datum: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Fahrer</label>
                  <select value={form.fahrer_id} onChange={(e) => setForm((f) => ({ ...f, fahrer_id: e.target.value }))} className={selectCls}>
                    <option value="">Kein Fahrer</option>
                    {team.map((m) => <option key={m.profile_id} value={m.profile_id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Fahrzeug</label>
                  <input value={form.fahrzeug} onChange={(e) => setForm((f) => ({ ...f, fahrzeug: e.target.value }))} className={inputCls} placeholder="KFZ-123" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Geplante km</label>
                  <input type="number" min="0" value={form.geplante_km} onChange={(e) => setForm((f) => ({ ...f, geplante_km: e.target.value }))} className={inputCls} placeholder="45" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Startort</label>
                  <input value={form.start_ort} onChange={(e) => setForm((f) => ({ ...f, start_ort: e.target.value }))} className={inputCls} placeholder="Depot München" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Endort</label>
                  <input value={form.end_ort} onChange={(e) => setForm((f) => ({ ...f, end_ort: e.target.value }))} className={inputCls} placeholder="Depot München" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Notizen</label>
                  <textarea value={form.notizen} onChange={(e) => setForm((f) => ({ ...f, notizen: e.target.value }))} className={`${inputCls} resize-none`} rows={2} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-[--border]">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-[--border] text-sm">Abbrechen</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-[--primary] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? "Speichern…" : editId ? "Aktualisieren" : "Erstellen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[--card] border border-[--border] rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold">Tour löschen?</p>
                <p className="text-sm text-[--muted-foreground]">Alle Einsätze werden ebenfalls gelöscht.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg border border-[--border] text-sm">Abbrechen</button>
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700">Löschen</button>
            </div>
          </div>
        </div>
      )}

      {/* Tour list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[--border] rounded-2xl">
          <Route className="w-12 h-12 text-[--muted-foreground] mx-auto mb-4 opacity-40" />
          <p className="text-[--muted-foreground]">Keine Touren gefunden</p>
          <button onClick={openNew} className="mt-4 text-sm text-[--primary] hover:underline">Erste Tour anlegen</button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((tour) => {
            const einsaetze = (tour.tour_einsaetze ?? []).sort((a, b) => a.reihenfolge - b.reihenfolge);
            const done = einsaetze.filter((e) => e.status === "abgeschlossen").length;
            const expanded = expandedId === tour.id;
            const tourStatus = STATUS_TOUR[tour.status] ?? { label: tour.status, color: "" };

            return (
              <div key={tour.id} className="border border-[--border] bg-[--card] rounded-xl overflow-hidden">
                {/* Tour header */}
                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[--primary]/10 flex items-center justify-center shrink-0">
                    <Route className="w-5 h-5 text-[--primary]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{tour.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tourStatus.color}`}>{tourStatus.label}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-[--muted-foreground] flex-wrap">
                      <span>{new Date(tour.datum + "T12:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}</span>
                      {tour.fahrer && (
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{tour.fahrer.vorname} {tour.fahrer.nachname}</span>
                      )}
                      {tour.fahrzeug && (
                        <span className="flex items-center gap-1"><Car className="w-3 h-3" />{tour.fahrzeug}</span>
                      )}
                      {einsaetze.length > 0 && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{done}/{einsaetze.length} Einsätze</span>
                      )}
                      {tour.geplante_km && (
                        <span>{tour.geplante_km} km</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <select
                      value={tour.status}
                      onChange={(e) => handleStatusChange(tour.id, e.target.value)}
                      className="text-xs rounded-lg border border-[--border] bg-[--background] px-2 py-1"
                    >
                      {Object.entries(STATUS_TOUR).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <button onClick={() => { setForm({ datum: tour.datum, name: tour.name, fahrer_id: "", fahrzeug: tour.fahrzeug ?? "", start_ort: tour.start_ort ?? "", end_ort: tour.end_ort ?? "", geplante_km: tour.geplante_km ? String(tour.geplante_km) : "", notizen: tour.notizen ?? "" }); setEditId(tour.id); setShowForm(true); }} className="p-2 rounded-lg hover:bg-[--muted]/30" title="Bearbeiten">
                      <Edit2 className="w-4 h-4 text-[--muted-foreground]" />
                    </button>
                    <button onClick={() => setDeleteId(tour.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                    <button onClick={() => setExpandedId(expanded ? null : tour.id)} className="p-2 rounded-lg hover:bg-[--muted]/30">
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Einsätze */}
                {expanded && (
                  <div className="border-t border-[--border]">
                    {einsaetze.length === 0 ? (
                      <div className="p-6 text-center text-sm text-[--muted-foreground]">
                        Keine Einsätze geplant — füge Einsätze über die API oder direkt in der Datenbank hinzu.
                      </div>
                    ) : (
                      <div className="divide-y divide-[--border]">
                        {einsaetze.map((e, idx) => {
                          const es = STATUS_EINSATZ[e.status] ?? { label: e.status, icon: Circle };
                          const EinsatzIcon = es.icon;
                          return (
                            <div key={e.id} className={`flex items-center gap-3 px-4 py-3 ${PRIO_COLOR[e.prioritaet] ?? ""}`}>
                              <span className="w-5 h-5 rounded-full bg-[--muted]/30 flex items-center justify-center text-xs font-medium shrink-0">{idx + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{e.kunde_name}</p>
                                <p className="text-xs text-[--muted-foreground] truncate">{e.kunde_adresse}</p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-[--muted-foreground]">
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{e.geplante_ankunft}–{e.geplante_abfahrt}</span>
                                  {e.leistungsart && <span>{e.leistungsart}{e.leistungsminuten ? ` (${e.leistungsminuten} min)` : ""}</span>}
                                  {e.prioritaet !== "normal" && <span className={`font-medium ${e.prioritaet === "dringend" ? "text-red-600" : "text-orange-600"}`}>{e.prioritaet === "dringend" ? "Dringend!" : "Hoch"}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <EinsatzIcon className={`w-4 h-4 ${e.status === "abgeschlossen" ? "text-green-600" : e.status === "nicht_angetroffen" ? "text-red-500" : "text-[--muted-foreground]"}`} />
                                <select
                                  value={e.status}
                                  disabled={updatingEinsatz === e.id}
                                  onChange={(ev) => handleEinsatzStatus(tour.id, e.id, ev.target.value)}
                                  className="text-xs rounded-lg border border-[--border] bg-[--background] px-2 py-1"
                                >
                                  {Object.entries(STATUS_EINSATZ).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {tour.notizen && (
                      <div className="px-4 pb-3 pt-2 text-xs text-[--muted-foreground] border-t border-[--border]">
                        {tour.notizen}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-[--muted-foreground] text-right">
        {filtered.length} von {touren.length} Touren · {touren.reduce((s, t) => s + (t.tour_einsaetze?.length ?? 0), 0)} Einsätze gesamt
      </p>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import {
  Plus, Trash2, CheckCircle2, Circle, ChevronDown, ChevronRight,
  Target, ClipboardList, TrendingUp, X, Loader2, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

interface Massnahme {
  id: string; beschreibung: string; haeufigkeit: string | null;
  verantwortlich: string | null; erledigt: boolean; erledigt_am: string | null; sort_order: number;
}
interface Evaluation {
  id: string; datum: string; ergebnis: "verbessert" | "unveraendert" | "verschlechtert" | "erreicht"; notiz: string | null; created_at: string;
}
interface Pflegeziel {
  id: string; titel: string; beschreibung: string | null;
  bereich: string; prioritaet: string; status: string;
  zieldatum: string | null; erreicht_am: string | null;
  familie_profile_id: string; created_at: string;
  pflegeziel_massnahmen: Massnahme[];
  pflegeziel_evaluationen: Evaluation[];
}

interface Props {
  ziele: Pflegeziel[];
  familieProfileId: string;
  initialStatus?: string;
}

const BEREICH_LABELS: Record<string, string> = {
  koerperpflege: "Körperpflege", ernaehrung: "Ernährung", mobilitaet: "Mobilität",
  kognition: "Kognition", soziales: "Soziales", schmerz: "Schmerz",
  wunden: "Wunden", medikamente: "Medikamente", allgemein: "Allgemein",
};
const PRIO_COLORS: Record<string, string> = {
  niedrig: "bg-gray-100 text-gray-600", mittel: "bg-blue-100 text-blue-700",
  hoch: "bg-orange-100 text-orange-700", dringend: "bg-red-100 text-red-700",
};
const STATUS_COLORS: Record<string, string> = {
  aktiv: "bg-green-100 text-green-700", erreicht: "bg-blue-100 text-blue-700",
  pausiert: "bg-yellow-100 text-yellow-700", abgebrochen: "bg-gray-100 text-gray-500",
};
const ERGEBNIS_COLORS: Record<string, string> = {
  verbessert: "text-green-600", unveraendert: "text-yellow-600",
  verschlechtert: "text-red-600", erreicht: "text-blue-600",
};

const EMPTY_ZIEL = { titel: "", beschreibung: "", bereich: "allgemein", prioritaet: "mittel", zieldatum: "" };

export default function PflegeplanungClient({ ziele: initial, familieProfileId, initialStatus }: Props) {
  const router = useRouter();
  const [ziele, setZiele] = useState<Pflegeziel[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_ZIEL);
  const [statusFilter, setStatusFilter] = useState(initialStatus ?? "");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [evalForms, setEvalForms] = useState<Record<string, { datum: string; ergebnis: string; notiz: string }>>({});
  const [massnahmeForms, setMassnahmeForms] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();

  function applyStatusFilter(v: string) {
    setStatusFilter(v);
    const params = new URLSearchParams();
    params.set("familie", familieProfileId);
    if (v) params.set("status", v);
    router.push(`/anbieter/pflegeplanung?${params.toString()}`);
  }

  async function handleCreate() {
    if (!form.titel.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pflegeziele", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, familie_profile_id: familieProfileId, zieldatum: form.zieldatum || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      const ziel: Pflegeziel = await res.json();
      ziel.pflegeziel_massnahmen = [];
      ziel.pflegeziel_evaluationen = [];
      setZiele((prev) => [ziel, ...prev]);
      setForm(EMPTY_ZIEL);
      setShowForm(false);
      toast.success("Pflegeziel erstellt");
    } catch { toast.error("Fehler beim Erstellen"); }
    finally { setSaving(false); }
  }

  async function handleStatusChange(id: string, status: string) {
    const prev = ziele.find((z) => z.id === id);
    startTransition(() => setZiele((list) => list.map((z) => z.id === id ? { ...z, status } : z)));
    const res = await fetch(`/api/pflegeziele/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok && prev) { setZiele((list) => list.map((z) => z.id === id ? prev : z)); toast.error("Fehler"); }
    else toast.success("Status aktualisiert");
  }

  async function handleDelete(id: string) {
    const prev = ziele.find((z) => z.id === id);
    startTransition(() => setZiele((list) => list.filter((z) => z.id !== id)));
    const res = await fetch(`/api/pflegeziele/${id}`, { method: "DELETE" });
    if (!res.ok) { if (prev) setZiele((list) => [prev, ...list]); toast.error("Fehler beim Löschen"); }
    else toast.success("Ziel gelöscht");
  }

  async function handleAddMassnahme(zielId: string) {
    const text = massnahmeForms[zielId]?.trim();
    if (!text) return;
    const res = await fetch(`/api/pflegeziele/${zielId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "massnahme", beschreibung: text }),
    });
    if (!res.ok) { toast.error("Fehler"); return; }
    const m: Massnahme = await res.json();
    setZiele((list) => list.map((z) => z.id === zielId ? { ...z, pflegeziel_massnahmen: [...z.pflegeziel_massnahmen, m] } : z));
    setMassnahmeForms((f) => ({ ...f, [zielId]: "" }));
    toast.success("Maßnahme hinzugefügt");
  }

  async function handleToggleMassnahme(zielId: string, mId: string, erledigt: boolean) {
    startTransition(() => setZiele((list) => list.map((z) => z.id === zielId
      ? { ...z, pflegeziel_massnahmen: z.pflegeziel_massnahmen.map((m) => m.id === mId ? { ...m, erledigt } : m) }
      : z)));
    await fetch(`/api/pflegeziele/${zielId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_massnahme", massnahme_id: mId, erledigt }),
    });
  }

  async function handleAddEvaluation(zielId: string) {
    const ef = evalForms[zielId];
    if (!ef?.ergebnis || !ef?.datum) return;
    const res = await fetch(`/api/pflegeziele/${zielId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "evaluation", datum: ef.datum, ergebnis: ef.ergebnis, notiz: ef.notiz }),
    });
    if (!res.ok) { toast.error("Fehler"); return; }
    const ev: Evaluation = await res.json();
    setZiele((list) => list.map((z) => {
      if (z.id !== zielId) return z;
      const updated = { ...z, pflegeziel_evaluationen: [ev, ...z.pflegeziel_evaluationen] };
      if (ef.ergebnis === "erreicht") updated.status = "erreicht";
      return updated;
    }));
    setEvalForms((f) => ({ ...f, [zielId]: { datum: new Date().toISOString().slice(0, 10), ergebnis: "", notiz: "" } }));
    toast.success("Evaluation gespeichert");
  }

  const filtered = statusFilter ? ziele.filter((z) => z.status === statusFilter) : ziele;

  return (
    <div className="space-y-6">
      {/* Filter + Create bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={statusFilter} onChange={(e) => applyStatusFilter(e.target.value)}
          className="border border-[--border] rounded-lg px-3 py-1.5 text-sm bg-[--card] text-[--foreground] focus:outline-none">
          <option value="">Alle Status</option>
          <option value="aktiv">Aktiv</option>
          <option value="erreicht">Erreicht</option>
          <option value="pausiert">Pausiert</option>
          <option value="abgebrochen">Abgebrochen</option>
        </select>
        <div className="ml-auto">
          <button onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[--primary] text-white rounded-lg text-sm font-medium hover:opacity-90">
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Abbrechen" : "Neues Ziel"}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-[--card] border border-[--border] rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-[--foreground] mb-4">Neues Pflegeziel definieren</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-xs text-[--muted-foreground]">Titel</label>
              <input type="text" value={form.titel} onChange={(e) => setForm((f) => ({ ...f, titel: e.target.value }))}
                placeholder="z.B. Selbstständige Körperpflege fördern"
                className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[--muted-foreground]">Bereich</label>
              <select value={form.bereich} onChange={(e) => setForm((f) => ({ ...f, bereich: e.target.value }))}
                className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] text-[--foreground] focus:outline-none">
                {Object.entries(BEREICH_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[--muted-foreground]">Priorität</label>
              <select value={form.prioritaet} onChange={(e) => setForm((f) => ({ ...f, prioritaet: e.target.value }))}
                className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] text-[--foreground] focus:outline-none">
                <option value="niedrig">Niedrig</option><option value="mittel">Mittel</option>
                <option value="hoch">Hoch</option><option value="dringend">Dringend</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[--muted-foreground]">Zieldatum (optional)</label>
              <input type="date" value={form.zieldatum} onChange={(e) => setForm((f) => ({ ...f, zieldatum: e.target.value }))}
                className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] text-[--foreground] focus:outline-none" />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-xs text-[--muted-foreground]">Beschreibung (optional)</label>
              <textarea rows={2} value={form.beschreibung} onChange={(e) => setForm((f) => ({ ...f, beschreibung: e.target.value }))}
                placeholder="Nähere Beschreibung des Pflegeziels…"
                className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background] text-[--foreground] focus:outline-none resize-none" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleCreate} disabled={saving || !form.titel.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-[--primary] text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {saving && <Loader2 size={14} className="animate-spin" />} Erstellen
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-5 py-2 bg-[--muted] text-[--muted-foreground] rounded-xl text-sm">Abbrechen</button>
          </div>
        </div>
      )}

      {/* Ziele list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[--muted] flex items-center justify-center mb-4">
            <Target size={28} className="text-[--muted-foreground]" />
          </div>
          <p className="text-[--foreground] font-medium">Keine Pflegeziele vorhanden</p>
          <p className="text-sm text-[--muted-foreground] mt-1">Legen Sie das erste Pflegeziel an.</p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-[--primary] text-white rounded-xl text-sm font-medium">
            <Plus size={15} /> Erstes Ziel erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((z) => {
            const isExpanded = expandedId === z.id;
            const massDone = z.pflegeziel_massnahmen.filter((m) => m.erledigt).length;
            const massTotal = z.pflegeziel_massnahmen.length;
            const ef = evalForms[z.id] ?? { datum: new Date().toISOString().slice(0, 10), ergebnis: "", notiz: "" };
            const mf = massnahmeForms[z.id] ?? "";

            return (
              <div key={z.id} className="bg-[--card] border border-[--border] rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 flex items-start gap-3">
                  <button onClick={() => setExpandedId(isExpanded ? null : z.id)}
                    className="mt-0.5 text-[--muted-foreground] hover:text-[--foreground] shrink-0">
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[--foreground] text-sm">{z.titel}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIO_COLORS[z.prioritaet]}`}>
                        {z.prioritaet}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[--muted] text-[--muted-foreground]">
                        {BEREICH_LABELS[z.bereich]}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[--muted-foreground]">
                      {z.zieldatum && <span>Ziel: {format(parseISO(z.zieldatum), "dd.MM.yy", { locale: de })}</span>}
                      {massTotal > 0 && <span className="flex items-center gap-1"><ClipboardList size={11} />{massDone}/{massTotal} Maßnahmen</span>}
                      {z.pflegeziel_evaluationen.length > 0 && (
                        <span className="flex items-center gap-1"><TrendingUp size={11} />{z.pflegeziel_evaluationen.length} Eval.</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select value={z.status} onChange={(e) => handleStatusChange(z.id, e.target.value)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 focus:outline-none cursor-pointer ${STATUS_COLORS[z.status]}`}>
                      <option value="aktiv">Aktiv</option>
                      <option value="erreicht">Erreicht</option>
                      <option value="pausiert">Pausiert</option>
                      <option value="abgebrochen">Abgebrochen</option>
                    </select>
                    <button onClick={() => handleDelete(z.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-[--muted-foreground] hover:text-red-600 transition-colors"
                      aria-label="Ziel löschen"><Trash2 size={14} /></button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-[--border] p-4 space-y-5">
                    {z.beschreibung && (
                      <p className="text-sm text-[--muted-foreground]">{z.beschreibung}</p>
                    )}

                    {/* Maßnahmen */}
                    <div>
                      <h4 className="text-xs font-semibold text-[--foreground] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ClipboardList size={13} /> Maßnahmen
                      </h4>
                      <div className="space-y-1.5 mb-3">
                        {z.pflegeziel_massnahmen.sort((a, b) => a.sort_order - b.sort_order).map((m) => (
                          <div key={m.id} className="flex items-start gap-2">
                            <button onClick={() => handleToggleMassnahme(z.id, m.id, !m.erledigt)} className="mt-0.5 shrink-0">
                              {m.erledigt
                                ? <CheckCircle2 size={16} className="text-green-500" />
                                : <Circle size={16} className="text-[--muted-foreground]" />}
                            </button>
                            <span className={`text-sm ${m.erledigt ? "line-through text-[--muted-foreground]" : "text-[--foreground]"}`}>
                              {m.beschreibung}
                              {m.haeufigkeit && <span className="text-[--muted-foreground] ml-1">· {m.haeufigkeit}</span>}
                            </span>
                          </div>
                        ))}
                        {z.pflegeziel_massnahmen.length === 0 && (
                          <p className="text-xs text-[--muted-foreground]">Noch keine Maßnahmen definiert.</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" value={mf} placeholder="Neue Maßnahme…"
                          onChange={(e) => setMassnahmeForms((f) => ({ ...f, [z.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && handleAddMassnahme(z.id)}
                          className="flex-1 border border-[--border] rounded-lg px-3 py-1.5 text-sm bg-[--background] text-[--foreground] focus:outline-none" />
                        <button onClick={() => handleAddMassnahme(z.id)}
                          className="px-3 py-1.5 bg-[--primary] text-white rounded-lg text-sm hover:opacity-90">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Evaluationen */}
                    <div>
                      <h4 className="text-xs font-semibold text-[--foreground] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <TrendingUp size={13} /> Evaluation
                      </h4>
                      {z.pflegeziel_evaluationen.length > 0 && (
                        <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
                          {z.pflegeziel_evaluationen.map((ev) => (
                            <div key={ev.id} className="flex items-start gap-2 text-sm">
                              <span className="text-[--muted-foreground] shrink-0 tabular-nums">
                                {format(parseISO(ev.datum), "dd.MM.yy", { locale: de })}
                              </span>
                              <span className={`font-medium shrink-0 ${ERGEBNIS_COLORS[ev.ergebnis]}`}>
                                {ev.ergebnis}
                              </span>
                              {ev.notiz && <span className="text-[--muted-foreground] truncate">{ev.notiz}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-2">
                        <input type="date" value={ef.datum}
                          onChange={(e) => setEvalForms((f) => ({ ...f, [z.id]: { ...ef, datum: e.target.value } }))}
                          className="border border-[--border] rounded-lg px-2 py-1.5 text-xs bg-[--background] text-[--foreground] focus:outline-none" />
                        <select value={ef.ergebnis}
                          onChange={(e) => setEvalForms((f) => ({ ...f, [z.id]: { ...ef, ergebnis: e.target.value } }))}
                          className="border border-[--border] rounded-lg px-2 py-1.5 text-xs bg-[--background] text-[--foreground] focus:outline-none">
                          <option value="">Ergebnis…</option>
                          <option value="verbessert">Verbessert</option>
                          <option value="unveraendert">Unverändert</option>
                          <option value="verschlechtert">Verschlechtert</option>
                          <option value="erreicht">Erreicht ✓</option>
                        </select>
                        <button onClick={() => handleAddEvaluation(z.id)} disabled={!ef.ergebnis}
                          className="px-3 py-1.5 bg-[--primary] text-white rounded-lg text-xs font-medium disabled:opacity-40">
                          Speichern
                        </button>
                        <input type="text" placeholder="Notiz (optional)" value={ef.notiz}
                          onChange={(e) => setEvalForms((f) => ({ ...f, [z.id]: { ...ef, notiz: e.target.value } }))}
                          className="col-span-3 border border-[--border] rounded-lg px-2 py-1.5 text-xs bg-[--background] text-[--foreground] focus:outline-none" />
                      </div>
                    </div>

                    {/* Warn if overdue */}
                    {z.zieldatum && z.status === "aktiv" && new Date(z.zieldatum) < new Date() && (
                      <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
                        <AlertTriangle size={13} />
                        Zieldatum überschritten: {format(parseISO(z.zieldatum), "dd.MM.yyyy", { locale: de })}
                      </div>
                    )}
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

"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Pill, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Medikament, DarreichungsformTyp } from "@/lib/health/types";
import { DARREICHUNGSFORMEN } from "@/lib/health/types";

function einheitBadge(menge: number) {
  if (menge === 0) return null;
  const label =
    menge === 0.5 ? "½" : menge === 1 ? "1" : menge === 1.5 ? "1½" : String(menge);
  return (
    <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-[--primary] text-white text-xs font-bold">
      {label}
    </span>
  );
}

function istAbgelaufen(med: Medikament): boolean {
  if (!med.bis_datum) return false;
  return new Date(med.bis_datum) < new Date();
}

const EMPTY_FORM = {
  name: "",
  wirkstoff: "",
  staerke: "",
  darreichungsform: "Tablette" as DarreichungsformTyp,
  morgens: 0,
  mittags: 0,
  abends: 0,
  nachts: 0,
  einheit: "Tablette",
  hinweis: "",
  verordnet_von: "",
  seit_datum: "",
  bis_datum: "",
  aktiv: true,
  dauermedikation: true,
};

export function MedikamentenPlan() {
  const [medikamente, setMedikamente] = useState<Medikament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => { laden(); }, []);

  async function laden() {
    try {
      const res = await fetch("/api/health/medikamente");
      if (!res.ok) throw new Error("Fehler beim Laden");
      setMedikamente(await res.json());
    } catch {
      toast.error("Medikamente konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function speichern() {
    setSaving(true);
    try {
      const body = {
        ...form,
        bis_datum: form.dauermedikation ? null : form.bis_datum || null,
        seit_datum: form.seit_datum || null,
        wirkstoff: form.wirkstoff || null,
        staerke: form.staerke || null,
        hinweis: form.hinweis || null,
        verordnet_von: form.verordnet_von || null,
      };
      const url = editId ? `/api/health/medikamente/${editId}` : "/api/health/medikamente";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Fehler beim Speichern");
      toast.success(editId ? "Medikament aktualisiert" : "Medikament hinzugefügt");
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_FORM);
      await laden();
    } catch {
      toast.error("Fehler beim Speichern des Medikaments.");
    } finally {
      setSaving(false);
    }
  }

  async function loeschen(id: string) {
    if (!confirm("Medikament wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/health/medikamente/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Medikament gelöscht");
      setMedikamente((prev) => prev.filter((m) => m.id !== id));
    } catch {
      toast.error("Fehler beim Löschen.");
    }
  }

  function bearbeiten(med: Medikament) {
    setForm({
      name: med.name,
      wirkstoff: med.wirkstoff ?? "",
      staerke: med.staerke ?? "",
      darreichungsform: (med.darreichungsform as DarreichungsformTyp) ?? "Tablette",
      morgens: med.morgens,
      mittags: med.mittags,
      abends: med.abends,
      nachts: med.nachts,
      einheit: med.einheit,
      hinweis: med.hinweis ?? "",
      verordnet_von: med.verordnet_von ?? "",
      seit_datum: med.seit_datum ?? "",
      bis_datum: med.bis_datum ?? "",
      aktiv: med.aktiv,
      dauermedikation: !med.bis_datum,
    });
    setEditId(med.id);
    setShowForm(true);
  }

  const aktive = medikamente.filter((m) => m.aktiv && !istAbgelaufen(m));
  const inaktive = medikamente.filter((m) => !m.aktiv || istAbgelaufen(m));

  if (loading) {
    return <div className="text-sm text-[--muted-foreground] py-8 text-center">Wird geladen…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Wochenplan-Tabelle */}
      {aktive.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[--border]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[--border] bg-[--muted]/50">
                <th className="text-left px-4 py-3 font-medium">Medikament</th>
                <th className="text-center px-3 py-3 font-medium">Morgens</th>
                <th className="text-center px-3 py-3 font-medium">Mittags</th>
                <th className="text-center px-3 py-3 font-medium">Abends</th>
                <th className="text-center px-3 py-3 font-medium">Nachts</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {aktive.map((med) => (
                <tr key={med.id} className="border-b border-[--border] last:border-0 hover:bg-[--muted]/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{med.name}</div>
                    {med.staerke && (
                      <div className="text-xs text-[--muted-foreground]">
                        {med.darreichungsform} {med.staerke}
                        {med.wirkstoff && ` · ${med.wirkstoff}`}
                      </div>
                    )}
                    {med.hinweis && (
                      <div className="text-xs text-amber-600 mt-0.5">{med.hinweis}</div>
                    )}
                  </td>
                  <td className="text-center px-3 py-3">{einheitBadge(med.morgens)}</td>
                  <td className="text-center px-3 py-3">{einheitBadge(med.mittags)}</td>
                  <td className="text-center px-3 py-3">{einheitBadge(med.abends)}</td>
                  <td className="text-center px-3 py-3">{einheitBadge(med.nachts)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => bearbeiten(med)}
                        className="p-1.5 rounded-lg hover:bg-[--muted] text-[--muted-foreground] transition-colors"
                        title="Bearbeiten"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => loeschen(med.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-[--muted-foreground] hover:text-red-600 transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aktive.length === 0 && !showForm && (
        <div className="text-center py-10 text-[--muted-foreground]">
          <Pill className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Medikamente eingetragen.</p>
        </div>
      )}

      {/* Abgelaufene / inaktive */}
      {inaktive.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-[--muted-foreground] hover:text-[--foreground] select-none">
            {inaktive.length} inaktive / abgelaufene Medikamente
          </summary>
          <div className="mt-2 space-y-1">
            {inaktive.map((med) => (
              <div key={med.id} className="flex items-center justify-between px-4 py-2 rounded-lg border border-[--border] opacity-50">
                <span className="text-sm line-through">{med.name}</span>
                <button onClick={() => loeschen(med.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Formular */}
      {showForm && (
        <div className="rounded-xl border border-[--border] p-5 space-y-4 bg-[--card]">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editId ? "Medikament bearbeiten" : "Neues Medikament"}</h3>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); }} className="text-[--muted-foreground] hover:text-[--foreground]">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="z.B. Metformin" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Wirkstoff</label>
              <Input value={form.wirkstoff} onChange={(e) => setForm({ ...form, wirkstoff: e.target.value })} placeholder="z.B. Metformin-HCl" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Stärke</label>
              <Input value={form.staerke} onChange={(e) => setForm({ ...form, staerke: e.target.value })} placeholder="z.B. 500mg" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Darreichungsform</label>
              <select
                value={form.darreichungsform}
                onChange={(e) => setForm({ ...form, darreichungsform: e.target.value as DarreichungsformTyp })}
                className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm"
              >
                {DARREICHUNGSFORMEN.map((df) => <option key={df}>{df}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Einheit</label>
              <Input value={form.einheit} onChange={(e) => setForm({ ...form, einheit: e.target.value })} placeholder="Tablette" />
            </div>
          </div>

          {/* Einnahme-Zeiten */}
          <div>
            <label className="block text-xs font-medium mb-2">Einnahme (Einheiten)</label>
            <div className="grid grid-cols-4 gap-2">
              {(["morgens", "mittags", "abends", "nachts"] as const).map((zeit) => (
                <div key={zeit}>
                  <label className="block text-xs text-[--muted-foreground] mb-1 capitalize">{zeit}</label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={form[zeit]}
                    onChange={(e) => setForm({ ...form, [zeit]: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Verordnet von</label>
              <Input value={form.verordnet_von} onChange={(e) => setForm({ ...form, verordnet_von: e.target.value })} placeholder="Arzt/Ärztin" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Seit</label>
              <Input type="date" value={form.seit_datum} onChange={(e) => setForm({ ...form, seit_datum: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.dauermedikation}
                onChange={(e) => setForm({ ...form, dauermedikation: e.target.checked })}
                className="rounded"
              />
              Dauermedikation (kein Enddatum)
            </label>
            {!form.dauermedikation && (
              <div className="mt-2">
                <label className="block text-xs font-medium mb-1">Bis</label>
                <Input type="date" value={form.bis_datum} onChange={(e) => setForm({ ...form, bis_datum: e.target.value })} />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Hinweis</label>
            <Input value={form.hinweis} onChange={(e) => setForm({ ...form, hinweis: e.target.value })} placeholder="z.B. mit viel Wasser einnehmen" />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={speichern} disabled={saving || !form.name.trim()} size="sm">
              <Check className="h-4 w-4 mr-1" />
              {saving ? "Speichern…" : "Speichern"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); }}>
              Abbrechen
            </Button>
          </div>
        </div>
      )}

      {!showForm && (
        <Button onClick={() => setShowForm(true)} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Medikament hinzufügen
        </Button>
      )}
    </div>
  );
}

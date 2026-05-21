"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Stethoscope, X, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Diagnose } from "@/lib/health/types";

export function DiagnosenListe() {
  const [diagnosen, setDiagnosen] = useState<Diagnose[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bezeichnung: "",
    icd10_code: "",
    erstdiagnose: "",
    arzt: "",
    chronisch: false,
    notizen: "",
  });

  useEffect(() => { laden(); }, []);

  async function laden() {
    try {
      const res = await fetch("/api/health/diagnosen");
      if (!res.ok) throw new Error();
      setDiagnosen(await res.json());
    } catch {
      toast.error("Diagnosen konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function speichern() {
    if (!form.bezeichnung.trim()) return;
    setSaving(true);
    try {
      const body = {
        ...form,
        icd10_code: form.icd10_code || null,
        erstdiagnose: form.erstdiagnose || null,
        arzt: form.arzt || null,
        notizen: form.notizen || null,
      };
      const res = await fetch("/api/health/diagnosen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success("Diagnose gespeichert");
      setShowForm(false);
      setForm({ bezeichnung: "", icd10_code: "", erstdiagnose: "", arzt: "", chronisch: false, notizen: "" });
      await laden();
    } catch {
      toast.error("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  async function loeschen(id: string) {
    if (!confirm("Diagnose wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/health/diagnosen/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Diagnose gelöscht");
      setDiagnosen((prev) => prev.filter((d) => d.id !== id));
    } catch {
      toast.error("Fehler beim Löschen.");
    }
  }

  if (loading) {
    return <div className="text-sm text-[--muted-foreground] py-8 text-center">Wird geladen…</div>;
  }

  return (
    <div className="space-y-4">
      {diagnosen.length === 0 && !showForm && (
        <div className="text-center py-10 text-[--muted-foreground]">
          <Stethoscope className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Diagnosen eingetragen.</p>
        </div>
      )}

      {diagnosen.map((d) => (
        <div key={d.id} className="flex items-start justify-between gap-4 p-4 rounded-xl border border-[--border] bg-[--card]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <span className="font-medium">{d.bezeichnung}</span>
              {d.chronisch && (
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Chronisch
                </Badge>
              )}
              {d.icd10_code && (
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-[--muted] text-[--muted-foreground] border border-[--border]">
                  {d.icd10_code}
                </span>
              )}
            </div>
            <div className="text-xs text-[--muted-foreground] space-y-0.5">
              {d.erstdiagnose && (
                <p>Erstdiagnose: {new Date(d.erstdiagnose).toLocaleDateString("de-DE")}</p>
              )}
              {d.arzt && <p>Arzt/Ärztin: {d.arzt}</p>}
              {d.notizen && <p className="mt-1 text-[--foreground]/70">{d.notizen}</p>}
            </div>
          </div>
          <button
            onClick={() => loeschen(d.id)}
            className="shrink-0 p-1.5 rounded-lg hover:bg-red-50 text-[--muted-foreground] hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {showForm && (
        <div className="rounded-xl border border-[--border] p-5 space-y-4 bg-[--card]">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Neue Diagnose</h3>
            <button onClick={() => setShowForm(false)} aria-label="Schließen" className="text-[--muted-foreground] hover:text-[--foreground]">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Bezeichnung *</label>
              <Input
                value={form.bezeichnung}
                onChange={(e) => setForm({ ...form, bezeichnung: e.target.value })}
                placeholder="z.B. Diabetes mellitus Typ 2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">ICD-10-Code (optional)</label>
              <Input
                value={form.icd10_code}
                onChange={(e) => setForm({ ...form, icd10_code: e.target.value.toUpperCase() })}
                placeholder="z.B. E11.9"
                className="font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Erstdiagnose</label>
              <Input type="date" value={form.erstdiagnose} onChange={(e) => setForm({ ...form, erstdiagnose: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Arzt/Ärztin</label>
              <Input value={form.arzt} onChange={(e) => setForm({ ...form, arzt: e.target.value })} placeholder="Name des Arztes" />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 text-sm cursor-pointer mt-4">
                <input
                  type="checkbox"
                  checked={form.chronisch}
                  onChange={(e) => setForm({ ...form, chronisch: e.target.checked })}
                  className="rounded"
                />
                Chronische Erkrankung
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Notizen</label>
              <textarea
                value={form.notizen}
                onChange={(e) => setForm({ ...form, notizen: e.target.value })}
                placeholder="Weitere Informationen…"
                rows={3}
                className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={speichern} disabled={saving || !form.bezeichnung.trim()} size="sm">
              <Check className="h-4 w-4 mr-1" />
              {saving ? "Speichern…" : "Speichern"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Abbrechen</Button>
          </div>
        </div>
      )}

      {!showForm && (
        <Button onClick={() => setShowForm(true)} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Diagnose hinzufügen
        </Button>
      )}
    </div>
  );
}

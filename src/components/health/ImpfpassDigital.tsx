"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Syringe, X, Check, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Impfung } from "@/lib/health/types";

function tageBis(datum: string): number {
  const heute = new Date();
  const ziel = new Date(datum);
  return Math.ceil((ziel.getTime() - heute.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}

export function ImpfpassDigital() {
  const [impfungen, setImpfungen] = useState<Impfung[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    krankheit: "",
    impfstoff: "",
    datum: "",
    naechste_impfung: "",
    arzt: "",
    charge: "",
  });

  useEffect(() => { laden(); }, []);

  async function laden() {
    try {
      const res = await fetch("/api/health/impfungen");
      if (!res.ok) throw new Error();
      setImpfungen(await res.json());
    } catch {
      toast.error("Impfungen konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function speichern() {
    if (!form.krankheit.trim() || !form.impfstoff.trim() || !form.datum) return;
    setSaving(true);
    try {
      const body = {
        ...form,
        naechste_impfung: form.naechste_impfung || null,
        arzt: form.arzt || null,
        charge: form.charge || null,
      };
      const res = await fetch("/api/health/impfungen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success("Impfung gespeichert");
      setShowForm(false);
      setForm({ krankheit: "", impfstoff: "", datum: "", naechste_impfung: "", arzt: "", charge: "" });
      await laden();
    } catch {
      toast.error("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  const baldFaellig = impfungen.filter(
    (i) => i.naechste_impfung && tageBis(i.naechste_impfung) <= 90 && tageBis(i.naechste_impfung) >= 0
  );
  const ueberfaellig = impfungen.filter(
    (i) => i.naechste_impfung && tageBis(i.naechste_impfung) < 0
  );

  if (loading) {
    return <div className="text-sm text-[--muted-foreground] py-8 text-center">Wird geladen…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Warnbanner überfällig */}
      {ueberfaellig.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">
              {ueberfaellig.length} Auffrischimpfung{ueberfaellig.length > 1 ? "en" : ""} überfällig
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {ueberfaellig.map((i) => i.krankheit).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Warnbanner bald fällig */}
      {baldFaellig.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {baldFaellig.length} Auffrischimpfung{baldFaellig.length > 1 ? "en" : ""} bald fällig
            </p>
            {baldFaellig.map((i) => (
              <p key={i.id} className="text-xs text-amber-700">
                {i.krankheit}: in {tageBis(i.naechste_impfung!)} Tagen ({formatDatum(i.naechste_impfung!)})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {impfungen.length === 0 && !showForm && (
        <div className="text-center py-10 text-[--muted-foreground]">
          <Syringe className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Impfungen eingetragen.</p>
        </div>
      )}

      <div className="relative">
        {impfungen.length > 0 && (
          <div className="absolute left-[22px] top-0 bottom-0 w-px bg-[--border]" />
        )}
        <div className="space-y-3">
          {impfungen.map((impf) => {
            const naechsteInTagen = impf.naechste_impfung ? tageBis(impf.naechste_impfung) : null;
            const istUeberfaellig = naechsteInTagen !== null && naechsteInTagen < 0;
            const istBaldFaellig = naechsteInTagen !== null && naechsteInTagen >= 0 && naechsteInTagen <= 90;
            return (
              <div key={impf.id} className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center border-2 bg-[--background] z-10 ${
                  istUeberfaellig ? "border-red-400" : istBaldFaellig ? "border-amber-400" : "border-[--primary]"
                }`}>
                  <Syringe className={`h-5 w-5 ${
                    istUeberfaellig ? "text-red-500" : istBaldFaellig ? "text-amber-500" : "text-[--primary]"
                  }`} />
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{impf.krankheit}</p>
                      <p className="text-xs text-[--muted-foreground]">{impf.impfstoff}</p>
                    </div>
                    <span className="text-xs text-[--muted-foreground] shrink-0">{formatDatum(impf.datum)}</span>
                  </div>
                  <div className="mt-1 text-xs text-[--muted-foreground] space-y-0.5">
                    {impf.arzt && <p>Arzt/Ärztin: {impf.arzt}</p>}
                    {impf.charge && <p className="font-mono">Charge: {impf.charge}</p>}
                    {impf.naechste_impfung && (
                      <p className={istUeberfaellig ? "text-red-600 font-medium" : istBaldFaellig ? "text-amber-600 font-medium" : ""}>
                        Nächste Impfung: {formatDatum(impf.naechste_impfung)}
                        {naechsteInTagen !== null && (
                          <span className="ml-1">
                            ({istUeberfaellig ? `${Math.abs(naechsteInTagen)} Tage überfällig` : `in ${naechsteInTagen} Tagen`})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formular */}
      {showForm && (
        <div className="rounded-xl border border-[--border] p-5 space-y-4 bg-[--card]">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Neue Impfung eintragen</h3>
            <button onClick={() => setShowForm(false)} aria-label="Schließen" className="text-[--muted-foreground] hover:text-[--foreground]">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Krankheit *</label>
              <Input value={form.krankheit} onChange={(e) => setForm({ ...form, krankheit: e.target.value })} placeholder="z.B. COVID-19" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Impfstoff *</label>
              <Input value={form.impfstoff} onChange={(e) => setForm({ ...form, impfstoff: e.target.value })} placeholder="z.B. Comirnaty" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Datum *</label>
              <Input type="date" value={form.datum} onChange={(e) => setForm({ ...form, datum: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Nächste Impfung</label>
              <Input type="date" value={form.naechste_impfung} onChange={(e) => setForm({ ...form, naechste_impfung: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Arzt/Ärztin</label>
              <Input value={form.arzt} onChange={(e) => setForm({ ...form, arzt: e.target.value })} placeholder="Praxis/Name" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Chargennummer</label>
              <Input value={form.charge} onChange={(e) => setForm({ ...form, charge: e.target.value })} placeholder="z.B. EL9685" className="font-mono" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={speichern}
              disabled={saving || !form.krankheit.trim() || !form.impfstoff.trim() || !form.datum}
              size="sm"
            >
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
          Impfung eintragen
        </Button>
      )}
    </div>
  );
}

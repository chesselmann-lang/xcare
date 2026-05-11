"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DokuEintrag } from "./DokuCard";

const KATEGORIEN = [
  { value: "allgemein",     label: "Allgemein" },
  { value: "koerperpflege", label: "Körperpflege" },
  { value: "ernaehrung",    label: "Ernährung" },
  { value: "mobilität",     label: "Mobilität" },
  { value: "medikamente",   label: "Medikamente" },
  { value: "vitalwerte",    label: "Vitalwerte" },
  { value: "wunde",         label: "Wundversorgung" },
  { value: "psychosozial",  label: "Psychosozial" },
  { value: "sonstiges",     label: "Sonstiges" },
] as const;

type Kategorie = (typeof KATEGORIEN)[number]["value"];

interface CareWorker {
  id: string;
  vorname: string;
  nachname: string;
}

interface DokuFormProps {
  familieProfileId?: string;
  careWorkers: CareWorker[];
  onCreated: (eintrag: DokuEintrag) => void;
}

export function DokuForm({ familieProfileId, careWorkers, onCreated }: DokuFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [kategorie, setKategorie] = useState<Kategorie>("allgemein");
  const [form, setForm] = useState({
    titel: "",
    inhalt: "",
    ereignis_datum: new Date().toISOString().slice(0, 16),
    care_worker_id: "",
    // Vitalwerte
    blutdruck_sys: "",
    blutdruck_dia: "",
    puls: "",
    temperatur: "",
    gewicht: "",
    blutzucker: "",
    sauerstoff: "",
    // Medikamente
    medikament_name: "",
    medikament_dosis: "",
    medikament_gegeben: false,
  });

  const set = (key: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.inhalt.trim()) { toast.error("Bitte Inhalt eingeben"); return; }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        kategorie,
        titel: form.titel || undefined,
        inhalt: form.inhalt,
        ereignis_datum: new Date(form.ereignis_datum).toISOString(),
        care_worker_id: form.care_worker_id || undefined,
        familie_profile_id: familieProfileId || undefined,
      };

      if (kategorie === "vitalwerte") {
        if (form.blutdruck_sys) payload.blutdruck_sys = parseInt(form.blutdruck_sys);
        if (form.blutdruck_dia) payload.blutdruck_dia = parseInt(form.blutdruck_dia);
        if (form.puls) payload.puls = parseInt(form.puls);
        if (form.temperatur) payload.temperatur = parseFloat(form.temperatur);
        if (form.gewicht) payload.gewicht = parseFloat(form.gewicht);
        if (form.blutzucker) payload.blutzucker = parseInt(form.blutzucker);
        if (form.sauerstoff) payload.sauerstoff = parseInt(form.sauerstoff);
      }

      if (kategorie === "medikamente") {
        payload.medikament_name = form.medikament_name || undefined;
        payload.medikament_dosis = form.medikament_dosis || undefined;
        payload.medikament_gegeben = form.medikament_gegeben;
      }

      const res = await fetch("/api/dokumentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Fehler");

      toast.success("Eintrag gespeichert");
      onCreated(data);
      setOpen(false);
      setForm({
        titel: "", inhalt: "",
        ereignis_datum: new Date().toISOString().slice(0, 16),
        care_worker_id: "",
        blutdruck_sys: "", blutdruck_dia: "", puls: "", temperatur: "",
        gewicht: "", blutzucker: "", sauerstoff: "",
        medikament_name: "", medikament_dosis: "", medikament_gegeben: false,
      });
      setKategorie("allgemein");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
        <Plus className="h-4 w-4" /> Neuer Eintrag
      </Button>
    );
  }

  return (
    <Card className="p-5 border-blue-200 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Neuen Eintrag anlegen</h3>
        <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100">
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Kategorie */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Kategorie *</label>
          <div className="flex flex-wrap gap-1.5">
            {KATEGORIEN.map(k => (
              <button
                key={k.value}
                onClick={() => setKategorie(k.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  kategorie === k.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pflegekraft + Datum */}
        <div className="grid grid-cols-2 gap-3">
          {careWorkers.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pflegekraft</label>
              <select
                value={form.care_worker_id}
                onChange={e => set("care_worker_id", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— auswählen —</option>
                {careWorkers.map(w => (
                  <option key={w.id} value={w.id}>{w.vorname} {w.nachname}</option>
                ))}
              </select>
            </div>
          )}
          <div className={careWorkers.length > 0 ? "" : "col-span-2"}>
            <label className="block text-xs font-medium text-gray-600 mb-1">Datum & Uhrzeit *</label>
            <input
              type="datetime-local"
              value={form.ereignis_datum}
              onChange={e => set("ereignis_datum", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Titel */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Titel (optional)</label>
          <input
            type="text"
            placeholder="z.B. Morgenroutine, Medikamentengabe 08:00"
            value={form.titel}
            onChange={e => set("titel", e.target.value)}
            maxLength={200}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Inhalt */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Pflegebeschreibung *</label>
          <textarea
            rows={4}
            placeholder="Beschreiben Sie die durchgeführten Pflegemaßnahmen, Beobachtungen und den Zustand des Pflegepersonen…"
            value={form.inhalt}
            onChange={e => set("inhalt", e.target.value)}
            maxLength={5000}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <p className="text-xs text-gray-400 text-right mt-0.5">{form.inhalt.length}/5000</p>
        </div>

        {/* Vitalwerte */}
        {kategorie === "vitalwerte" && (
          <div className="bg-red-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-red-800 uppercase tracking-wide">Vitalwerte</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { key: "blutdruck_sys", label: "RR systolisch", unit: "mmHg", placeholder: "120" },
                { key: "blutdruck_dia", label: "RR diastolisch", unit: "mmHg", placeholder: "80" },
                { key: "puls", label: "Puls", unit: "bpm", placeholder: "72" },
                { key: "temperatur", label: "Temperatur", unit: "°C", placeholder: "36.5" },
                { key: "gewicht", label: "Gewicht", unit: "kg", placeholder: "75.0" },
                { key: "blutzucker", label: "Blutzucker", unit: "mg/dL", placeholder: "90" },
                { key: "sauerstoff", label: "SpO₂", unit: "%", placeholder: "98" },
              ].map(({ key, label, unit, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label} <span className="text-gray-400">({unit})</span></label>
                  <input
                    type="number"
                    placeholder={placeholder}
                    value={form[key as keyof typeof form] as string}
                    onChange={e => set(key, e.target.value)}
                    className="w-full border border-red-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medikamente */}
        {kategorie === "medikamente" && (
          <div className="bg-purple-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide">Medikament</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Medikament</label>
                <input
                  type="text"
                  placeholder="z.B. Aspirin"
                  value={form.medikament_name}
                  onChange={e => set("medikament_name", e.target.value)}
                  maxLength={200}
                  className="w-full border border-purple-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dosis</label>
                <input
                  type="text"
                  placeholder="z.B. 100mg, 1 Tablette"
                  value={form.medikament_dosis}
                  onChange={e => set("medikament_dosis", e.target.value)}
                  maxLength={100}
                  className="w-full border border-purple-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.medikament_gegeben}
                onChange={e => set("medikament_gegeben", e.target.checked)}
                className="w-4 h-4 accent-purple-600"
              />
              <span className="text-sm text-gray-700">Medikament wurde verabreicht</span>
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Eintrag speichern
          </Button>
        </div>
      </div>
    </Card>
  );
}

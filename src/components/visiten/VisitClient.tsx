"use client";

import { useState } from "react";
import { toast } from "sonner";

const TYP_LABELS: Record<string, string> = {
  regelvisite: "Regelvisite",
  anlassvisite: "Anlassvisite",
  fallbesprechung: "Fallbesprechung",
  entlassvisite: "Entlassvisite",
  aufnahmevisite: "Aufnahmevisite",
};

const STATUS_COLORS: Record<string, string> = {
  geplant: "bg-blue-100 text-blue-800",
  durchgefuehrt: "bg-green-100 text-green-800",
  abgesagt: "bg-gray-100 text-gray-600",
};

interface Aufgabe {
  id: string;
  aufgabe: string;
  verantwortlich: string | null;
  faellig_bis: string | null;
  prioritaet: string;
  erledigt: boolean;
}

interface Visite {
  id: string;
  datum: string;
  uhrzeit: string | null;
  typ: string;
  status: string;
  teilnehmer: string[];
  allgemeinzustand: string | null;
  befunde: string | null;
  probleme: string | null;
  massnahmen: string | null;
  ziele: string | null;
  naechste_visite: string | null;
  aufgaben: Aufgabe[];
}

interface VisitClientProps {
  bewohnerId: string;
  bewohnerName: string;
  initialVisiten: Visite[];
  stats: { gesamt: number; geplant: number; durchgefuehrt: number; offeneAufgaben: number };
}

const EMPTY_AUFGABE = { aufgabe: "", verantwortlich: "", faellig_bis: "", prioritaet: "normal" };

export function VisitClient({ bewohnerId, bewohnerName, initialVisiten, stats: initialStats }: VisitClientProps) {
  const [visiten, setVisiten] = useState<Visite[]>(initialVisiten);
  const [stats, setStats] = useState(initialStats);
  const [selected, setSelected] = useState<Visite | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    datum: new Date().toISOString().slice(0, 10),
    uhrzeit: "",
    typ: "regelvisite",
    teilnehmerInput: "",
    allgemeinzustand: "",
    befunde: "",
    probleme: "",
    massnahmen: "",
    ziele: "",
    naechste_visite: "",
    hinweise: "",
    aufgaben: [{ ...EMPTY_AUFGABE }],
  });

  async function handleSave() {
    setSaving(true);
    try {
      const teilnehmer = form.teilnehmerInput
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
      const aufgaben = form.aufgaben.filter(a => a.aufgabe.trim());
      const res = await fetch(`/api/bewohner/${bewohnerId}/visiten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, teilnehmer, aufgaben, uhrzeit: form.uhrzeit || null, naechste_visite: form.naechste_visite || null }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      const neu: Visite = { ...json.visite, aufgaben: [] };
      setVisiten(prev => [neu, ...prev]);
      setStats(s => ({ ...s, gesamt: s.gesamt + 1, geplant: s.geplant + 1 }));
      setShowForm(false);
      toast.success("Visite angelegt");
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(visite: Visite, status: string) {
    try {
      const res = await fetch(`/api/visiten/${visite.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const updated = { ...visite, status };
      setVisiten(prev => prev.map(v => v.id === visite.id ? updated : v));
      if (selected?.id === visite.id) setSelected(updated);
      toast.success(status === "durchgefuehrt" ? "Visite als durchgeführt markiert" : "Status aktualisiert");
    } catch {
      toast.error("Fehler");
    }
  }

  async function handleAufgabeToggle(visite: Visite, aufgabe: Aufgabe) {
    try {
      await fetch(`/api/visiten/${visite.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aufgabe_id: aufgabe.id, erledigt: !aufgabe.erledigt }),
      });
      const updated = { ...visite, aufgaben: visite.aufgaben.map(a => a.id === aufgabe.id ? { ...a, erledigt: !a.erledigt } : a) };
      setVisiten(prev => prev.map(v => v.id === visite.id ? updated : v));
      if (selected?.id === visite.id) setSelected(updated);
    } catch {
      toast.error("Fehler");
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pflegevisite & Fallbesprechung</h1>
          <p className="text-gray-500">{bewohnerName}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
          + Neue Visite
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Gesamt", value: stats.gesamt, color: "bg-blue-50 text-blue-700" },
          { label: "Geplant", value: stats.geplant, color: "bg-yellow-50 text-yellow-700" },
          { label: "Durchgeführt", value: stats.durchgefuehrt, color: "bg-green-50 text-green-700" },
          { label: "Offene Aufgaben", value: stats.offeneAufgaben, color: "bg-orange-50 text-orange-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Visiten-Liste */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700">Visiten</h2>
          {visiten.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-400">
              Noch keine Visiten angelegt
            </div>
          )}
          {visiten.map(v => (
            <button key={v.id} onClick={() => setSelected(v)}
              className={`w-full text-left bg-white border-2 rounded-xl p-4 hover:border-blue-400 transition-colors ${selected?.id === v.id ? "border-blue-500" : "border-gray-200"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{TYP_LABELS[v.typ] ?? v.typ}</div>
                  <div className="text-sm text-gray-500">{new Date(v.datum).toLocaleDateString("de-DE")}{v.uhrzeit ? ` · ${v.uhrzeit} Uhr` : ""}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[v.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {v.status === "durchgefuehrt" ? "Durchgeführt" : v.status === "geplant" ? "Geplant" : "Abgesagt"}
                </span>
              </div>
              {v.aufgaben.length > 0 && (
                <div className="mt-2 text-xs text-gray-400">
                  {v.aufgaben.filter((a: any) => !a.erledigt).length} offene Aufgabe(n)
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Detail */}
        <div>
          {!selected ? (
            <div className="h-48 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl">
              Visite auswählen
            </div>
          ) : (
            <div className="bg-white border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{TYP_LABELS[selected.typ] ?? selected.typ}</h2>
                {selected.status === "geplant" && (
                  <button onClick={() => handleStatusChange(selected, "durchgefuehrt")}
                    className="text-sm bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 font-medium">
                    ✓ Als durchgeführt markieren
                  </button>
                )}
              </div>

              <div className="text-sm text-gray-500">
                {new Date(selected.datum).toLocaleDateString("de-DE")}{selected.uhrzeit ? ` · ${selected.uhrzeit} Uhr` : ""}
              </div>

              {selected.teilnehmer?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Teilnehmer</div>
                  <div className="flex flex-wrap gap-1">
                    {selected.teilnehmer.map((t: string, i: number) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {[
                { label: "Allgemeinzustand", value: selected.allgemeinzustand },
                { label: "Befunde", value: selected.befunde },
                { label: "Probleme", value: selected.probleme },
                { label: "Maßnahmen", value: selected.massnahmen },
                { label: "Ziele", value: selected.ziele },
                { label: "Hinweise", value: selected.hinweise },
              ].filter(f => f.value).map(f => (
                <div key={f.label}>
                  <div className="text-xs font-medium text-gray-500 mb-1">{f.label}</div>
                  <p className="text-sm text-gray-800">{f.value}</p>
                </div>
              ))}

              {selected.naechste_visite && (
                <div className="text-sm text-blue-600">
                  📅 Nächste Visite: {new Date(selected.naechste_visite).toLocaleDateString("de-DE")}
                </div>
              )}

              {selected.aufgaben.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">Aufgaben</div>
                  <div className="space-y-2">
                    {selected.aufgaben.map(a => (
                      <div key={a.id} className={`flex items-start gap-3 p-2 rounded-lg ${a.erledigt ? "bg-gray-50 opacity-60" : "bg-orange-50"}`}>
                        <input type="checkbox" checked={a.erledigt} onChange={() => handleAufgabeToggle(selected, a)}
                          className="mt-0.5 rounded accent-blue-600" />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${a.erledigt ? "line-through text-gray-400" : "text-gray-800"}`}>{a.aufgabe}</p>
                          <div className="flex gap-2 mt-0.5 text-xs text-gray-400">
                            {a.verantwortlich && <span>👤 {a.verantwortlich}</span>}
                            {a.faellig_bis && <span>📅 {new Date(a.faellig_bis).toLocaleDateString("de-DE")}</span>}
                          </div>
                        </div>
                        {a.prioritaet === "hoch" && !a.erledigt && (
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Hoch</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Neue Visite */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 my-8">
            <h2 className="text-lg font-bold">Neue Visite / Fallbesprechung</h2>

            <div className="grid grid-cols-3 gap-2">
              {Object.entries(TYP_LABELS).map(([val, lbl]) => (
                <button key={val} onClick={() => setForm(f => ({ ...f, typ: val }))}
                  className={`py-2 px-2 rounded-lg border text-xs text-center transition-colors ${form.typ === val ? "border-blue-500 bg-blue-50 text-blue-700 font-medium" : "border-gray-200 hover:border-gray-300"}`}>
                  {lbl}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                <input type="date" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Uhrzeit</label>
                <input type="time" value={form.uhrzeit} onChange={e => setForm(f => ({ ...f, uhrzeit: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teilnehmer (kommagetrennt)</label>
              <input value={form.teilnehmerInput} onChange={e => setForm(f => ({ ...f, teilnehmerInput: e.target.value }))}
                placeholder="z.B. Pflegedienstleitung, Arzt Dr. Müller, Angehörige Frau Schmidt"
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>

            {[
              { key: "allgemeinzustand", label: "Allgemeinzustand" },
              { key: "befunde", label: "Befunde" },
              { key: "probleme", label: "Probleme / Diagnosen" },
              { key: "massnahmen", label: "Maßnahmen" },
              { key: "ziele", label: "Ziele" },
              { key: "hinweise", label: "Hinweise" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <textarea value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nächste Visite</label>
              <input type="date" value={form.naechste_visite} onChange={e => setForm(f => ({ ...f, naechste_visite: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Aufgaben</label>
                <button onClick={() => setForm(f => ({ ...f, aufgaben: [...f.aufgaben, { ...EMPTY_AUFGABE }] }))}
                  className="text-xs text-blue-600 hover:underline">+ Aufgabe</button>
              </div>
              <div className="space-y-2">
                {form.aufgaben.map((a, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input value={a.aufgabe} onChange={e => setForm(f => ({ ...f, aufgaben: f.aufgaben.map((x, j) => j === i ? { ...x, aufgabe: e.target.value } : x) }))}
                      placeholder="Aufgabe beschreiben…" className="flex-1 border rounded-lg px-3 py-1.5 text-sm" />
                    <input value={a.verantwortlich} onChange={e => setForm(f => ({ ...f, aufgaben: f.aufgaben.map((x, j) => j === i ? { ...x, verantwortlich: e.target.value } : x) }))}
                      placeholder="Wer?" className="w-28 border rounded-lg px-3 py-1.5 text-sm" />
                    <input type="date" value={a.faellig_bis} onChange={e => setForm(f => ({ ...f, aufgaben: f.aufgaben.map((x, j) => j === i ? { ...x, faellig_bis: e.target.value } : x) }))}
                      className="w-36 border rounded-lg px-3 py-1.5 text-sm" />
                    {form.aufgaben.length > 1 && (
                      <button onClick={() => setForm(f => ({ ...f, aufgaben: f.aufgaben.filter((_, j) => j !== i) }))}
                        className="text-red-400 hover:text-red-600 text-sm">✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Abbrechen</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Speichern…" : "Visite anlegen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

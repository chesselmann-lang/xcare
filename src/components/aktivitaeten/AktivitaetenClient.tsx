"use client";

import { useState } from "react";
import { toast } from "sonner";

const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

const KATEGORIEN: { value: string; label: string; emoji: string }[] = [
  { value: "bewegung", label: "Bewegung", emoji: "🏃" },
  { value: "kultur", label: "Kultur", emoji: "🎨" },
  { value: "sozial", label: "Sozial", emoji: "👥" },
  { value: "therapie", label: "Therapie", emoji: "💆" },
  { value: "religion", label: "Religion", emoji: "⛪" },
  { value: "ausflug", label: "Ausflug", emoji: "🚌" },
  { value: "handwerk", label: "Handwerk", emoji: "🔨" },
  { value: "musik", label: "Musik", emoji: "🎵" },
  { value: "gedaechtnis", label: "Gedächtnis", emoji: "🧠" },
  { value: "sonstiges", label: "Sonstiges", emoji: "📌" },
];

interface Angebot {
  id: string;
  titel: string;
  beschreibung: string | null;
  kategorie: string;
  wochentag: number | null;
  uhrzeit: string | null;
  dauer_min: number;
  kapazitaet: number | null;
  ort: string | null;
  aktiv: boolean;
  verantwortlich: string | null;
}

interface AktivitaetenClientProps {
  initialAngebote: Angebot[];
  stats: { gesamt: number; aktiv: number; kategorien: number };
}

export function AktivitaetenClient({ initialAngebote, stats: initialStats }: AktivitaetenClientProps) {
  const [angebote, setAngebote] = useState<Angebot[]>(initialAngebote);
  const [stats, setStats] = useState(initialStats);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterKat, setFilterKat] = useState<string>("alle");

  const [form, setForm] = useState({
    titel: "", beschreibung: "", kategorie: "sozial",
    wochentag: "", uhrzeit: "", dauer_min: "60",
    kapazitaet: "", ort: "", verantwortlich: "",
  });

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/aktivitaeten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          wochentag: form.wochentag !== "" ? parseInt(form.wochentag) : null,
          dauer_min: parseInt(form.dauer_min) || 60,
          kapazitaet: form.kapazitaet ? parseInt(form.kapazitaet) : null,
        }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setAngebote(prev => [...prev, json.angebot]);
      setStats(s => ({ ...s, gesamt: s.gesamt + 1, aktiv: s.aktiv + 1 }));
      setShowForm(false);
      setForm({ titel: "", beschreibung: "", kategorie: "sozial", wochentag: "", uhrzeit: "", dauer_min: "60", kapazitaet: "", ort: "", verantwortlich: "" });
      toast.success("Angebot angelegt");
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAktiv(angebot: Angebot) {
    try {
      await fetch(`/api/aktivitaeten/${angebot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktiv: !angebot.aktiv }),
      });
      setAngebote(prev => prev.map(a => a.id === angebot.id ? { ...a, aktiv: !a.aktiv } : a));
      toast.success(angebot.aktiv ? "Angebot deaktiviert" : "Angebot aktiviert");
    } catch {
      toast.error("Fehler");
    }
  }

  const filteredAngebote = filterKat === "alle"
    ? angebote
    : angebote.filter(a => a.kategorie === filterKat);

  const katForAngebot = (a: Angebot) => KATEGORIEN.find(k => k.value === a.kategorie);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Aktivitäten & Soziale Teilhabe</h1>
          <p className="text-gray-500">Angebotsverwaltung</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium">
          + Neues Angebot
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Angebote gesamt", value: stats.gesamt, color: "bg-purple-50 text-purple-700" },
          { label: "Aktiv", value: stats.aktiv, color: "bg-green-50 text-green-700" },
          { label: "Kategorien", value: stats.kategorien, color: "bg-blue-50 text-blue-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterKat("alle")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterKat === "alle" ? "bg-purple-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
          Alle
        </button>
        {KATEGORIEN.map(k => (
          <button key={k.value} onClick={() => setFilterKat(k.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterKat === k.value ? "bg-purple-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
            {k.emoji} {k.label}
          </button>
        ))}
      </div>

      {/* Angebote-Grid */}
      {filteredAngebote.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl text-gray-400">
          Noch keine Angebote angelegt
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredAngebote.map(a => {
            const kat = katForAngebot(a);
            return (
              <div key={a.id} className={`bg-white border-2 rounded-xl p-4 space-y-2 ${!a.aktiv ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{kat?.emoji ?? "📌"}</span>
                    <div>
                      <p className="font-semibold">{a.titel}</p>
                      <p className="text-xs text-gray-500">{kat?.label}</p>
                    </div>
                  </div>
                  <button onClick={() => toggleAktiv(a)}
                    className={`text-xs px-2 py-1 rounded-full font-medium ${a.aktiv ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {a.aktiv ? "Aktiv" : "Inaktiv"}
                  </button>
                </div>
                {a.beschreibung && <p className="text-sm text-gray-600">{a.beschreibung}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-1">
                  {a.wochentag !== null && <span>📅 {WOCHENTAGE[a.wochentag]}</span>}
                  {a.uhrzeit && <span>⏰ {a.uhrzeit} Uhr</span>}
                  <span>⏱ {a.dauer_min} Min.</span>
                  {a.ort && <span>📍 {a.ort}</span>}
                  {a.kapazitaet && <span>👥 max. {a.kapazitaet}</span>}
                  {a.verantwortlich && <span>👤 {a.verantwortlich}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 my-8">
            <h2 className="text-lg font-bold">Neues Aktivitätsangebot</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
              <input value={form.titel} onChange={e => setForm(f => ({ ...f, titel: e.target.value }))}
                placeholder="z.B. Morgengymnastik, Spielenachmittag…"
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kategorie</label>
              <div className="grid grid-cols-5 gap-1.5">
                {KATEGORIEN.map(k => (
                  <button key={k.value} onClick={() => setForm(f => ({ ...f, kategorie: k.value }))}
                    className={`py-2 rounded-lg border text-center transition-colors ${form.kategorie === k.value ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 hover:border-gray-300"}`}>
                    <div className="text-lg">{k.emoji}</div>
                    <div className="text-xs">{k.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wochentag</label>
                <select value={form.wochentag} onChange={e => setForm(f => ({ ...f, wochentag: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Kein fester Tag</option>
                  {WOCHENTAGE.map((t, i) => <option key={i} value={i}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Uhrzeit</label>
                <input type="time" value={form.uhrzeit} onChange={e => setForm(f => ({ ...f, uhrzeit: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dauer (Min.)</label>
                <input type="number" value={form.dauer_min} onChange={e => setForm(f => ({ ...f, dauer_min: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" min="15" step="15" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max. Teilnehmer</label>
                <input type="number" value={form.kapazitaet} onChange={e => setForm(f => ({ ...f, kapazitaet: e.target.value }))}
                  placeholder="unbegrenzt" className="w-full border rounded-lg px-3 py-2 text-sm" min="1" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
              <input value={form.ort} onChange={e => setForm(f => ({ ...f, ort: e.target.value }))}
                placeholder="z.B. Gemeinschaftsraum EG" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verantwortlich</label>
              <input value={form.verantwortlich} onChange={e => setForm(f => ({ ...f, verantwortlich: e.target.value }))}
                placeholder="Name der verantwortlichen Person" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
              <textarea value={form.beschreibung} onChange={e => setForm(f => ({ ...f, beschreibung: e.target.value }))}
                rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Abbrechen</button>
              <button onClick={handleSave} disabled={saving || !form.titel.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
                {saving ? "Speichern…" : "Angebot anlegen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

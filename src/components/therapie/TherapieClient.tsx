"use client";

import { useState } from "react";
import { toast } from "sonner";

const THERAPIEARTEN = [
  { value: "physiotherapie", label: "Physiotherapie", emoji: "🏃" },
  { value: "ergotherapie", label: "Ergotherapie", emoji: "🤲" },
  { value: "logopaedie", label: "Logopädie", emoji: "💬" },
  { value: "musiktherapie", label: "Musiktherapie", emoji: "🎵" },
  { value: "kunsttherapie", label: "Kunsttherapie", emoji: "🎨" },
  { value: "sonstiges", label: "Sonstiges", emoji: "➕" },
] as const;

const VERLAUF_LABELS: Record<string, string> = {
  sehr_gut: "Sehr gut",
  gut: "Gut",
  mittel: "Mittel",
  schlecht: "Schlecht",
  abgebrochen: "Abgebrochen",
};

const VERLAUF_COLORS: Record<string, string> = {
  sehr_gut: "bg-green-100 text-green-800",
  gut: "bg-blue-100 text-blue-800",
  mittel: "bg-yellow-100 text-yellow-800",
  schlecht: "bg-orange-100 text-orange-800",
  abgebrochen: "bg-red-100 text-red-800",
};

const STATUS_COLORS: Record<string, string> = {
  aktiv: "bg-green-100 text-green-800",
  pausiert: "bg-yellow-100 text-yellow-800",
  abgeschlossen: "bg-gray-100 text-gray-700",
};

interface Therapie {
  id: string;
  therapieart: string;
  therapeut_name: string | null;
  ziel: string | null;
  frequenz: string | null;
  beginn_datum: string;
  ende_datum: string | null;
  status: string;
  notizen: string | null;
  erstellt_am: string;
}

interface Einheit {
  id: string;
  datum: string;
  dauer_min: number;
  verlauf: string;
  inhalt: string | null;
  abgesagt: boolean;
  abgerechnet: boolean;
}

interface TherapieClientProps {
  bewohnerId: string;
  bewohnerName: string;
  initialTherapien: Therapie[];
  stats: { gesamt: number; aktiv: number; pausiert: number; abgeschlossen: number };
}

export function TherapieClient({ bewohnerId, bewohnerName, initialTherapien, stats }: TherapieClientProps) {
  const [therapien, setTherapien] = useState<Therapie[]>(initialTherapien);
  const [selectedTherapie, setSelectedTherapie] = useState<Therapie | null>(null);
  const [einheiten, setEinheiten] = useState<Einheit[]>([]);
  const [loadingEinheiten, setLoadingEinheiten] = useState(false);
  const [showNeuForm, setShowNeuForm] = useState(false);
  const [showEinheitForm, setShowEinheitForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    therapieart: "physiotherapie",
    therapeut_name: "",
    ziel: "",
    frequenz: "2x wöchentlich",
    beginn_datum: new Date().toISOString().slice(0, 10),
    ende_datum: "",
    notizen: "",
  });

  const [einheitForm, setEinheitForm] = useState({
    datum: new Date().toISOString().slice(0, 10),
    dauer_min: "45",
    inhalt: "",
    verlauf: "gut",
    kooperation: "",
    zielfortschritt: "",
    abgesagt: false,
    abgesagt_grund: "",
    abgerechnet: false,
  });

  async function loadEinheiten(therapie: Therapie) {
    setSelectedTherapie(therapie);
    setLoadingEinheiten(true);
    try {
      const res = await fetch(`/api/therapie/${therapie.id}/einheiten`);
      const json = await res.json();
      setEinheiten(json.einheiten ?? []);
    } finally {
      setLoadingEinheiten(false);
    }
  }

  async function handleSaveTherapie() {
    setSaving(true);
    try {
      const res = await fetch(`/api/bewohner/${bewohnerId}/therapie`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ende_datum: form.ende_datum || null }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setTherapien(prev => [json.therapie, ...prev]);
      setShowNeuForm(false);
      setForm({ therapieart: "physiotherapie", therapeut_name: "", ziel: "", frequenz: "2x wöchentlich", beginn_datum: new Date().toISOString().slice(0, 10), ende_datum: "", notizen: "" });
      toast.success("Therapie angelegt");
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEinheit() {
    if (!selectedTherapie) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/therapie/${selectedTherapie.id}/einheiten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...einheitForm,
          dauer_min: parseInt(einheitForm.dauer_min) || 45,
          kooperation: einheitForm.kooperation || null,
          zielfortschritt: einheitForm.zielfortschritt || null,
          abgesagt_grund: einheitForm.abgesagt_grund || null,
        }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setEinheiten(prev => [json.einheit, ...prev]);
      setShowEinheitForm(false);
      setEinheitForm({ datum: new Date().toISOString().slice(0, 10), dauer_min: "45", inhalt: "", verlauf: "gut", kooperation: "", zielfortschritt: "", abgesagt: false, abgesagt_grund: "", abgerechnet: false });
      toast.success("Einheit dokumentiert");
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  const getTherapieart = (art: string) => THERAPIEARTEN.find(a => a.value === art) ?? { label: art, emoji: "➕" };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Therapiemanagement</h1>
          <p className="text-gray-500">{bewohnerName}</p>
        </div>
        <button
          onClick={() => setShowNeuForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
        >
          + Neue Therapie
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Gesamt", value: stats.gesamt, color: "bg-blue-50 text-blue-700" },
          { label: "Aktiv", value: stats.aktiv, color: "bg-green-50 text-green-700" },
          { label: "Pausiert", value: stats.pausiert, color: "bg-yellow-50 text-yellow-700" },
          { label: "Abgeschlossen", value: stats.abgeschlossen, color: "bg-gray-50 text-gray-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Therapien-Liste */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700">Therapiepläne</h2>
          {therapien.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-400">
              Noch keine Therapien angelegt
            </div>
          )}
          {therapien.map(t => {
            const art = getTherapieart(t.therapieart);
            return (
              <button
                key={t.id}
                onClick={() => loadEinheiten(t)}
                className={`w-full text-left bg-white border-2 rounded-xl p-4 hover:border-blue-400 transition-colors ${selectedTherapie?.id === t.id ? "border-blue-500 shadow-sm" : "border-gray-200"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{art.emoji}</span>
                    <div>
                      <div className="font-medium">{art.label}</div>
                      {t.therapeut_name && <div className="text-sm text-gray-500">{t.therapeut_name}</div>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                  </span>
                </div>
                {t.ziel && <p className="mt-2 text-sm text-gray-600 line-clamp-2">{t.ziel}</p>}
                <div className="mt-2 flex gap-3 text-xs text-gray-400">
                  <span>ab {new Date(t.beginn_datum).toLocaleDateString("de-DE")}</span>
                  {t.frequenz && <span>• {t.frequenz}</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Einheiten / Detail */}
        <div>
          {!selectedTherapie ? (
            <div className="h-48 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl">
              Therapie auswählen um Einheiten zu sehen
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-700">
                  Einheiten — {getTherapieart(selectedTherapie.therapieart).label}
                </h2>
                <button
                  onClick={() => setShowEinheitForm(true)}
                  className="text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium"
                >
                  + Einheit
                </button>
              </div>
              {loadingEinheiten && <div className="text-gray-400 text-sm">Lädt…</div>}
              {!loadingEinheiten && einheiten.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-xl text-gray-400 text-sm">
                  Noch keine Einheiten dokumentiert
                </div>
              )}
              {einheiten.map(e => (
                <div key={e.id} className={`bg-white border rounded-xl p-3 ${e.abgesagt ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{new Date(e.datum).toLocaleDateString("de-DE")}</span>
                    <div className="flex gap-2">
                      {e.abgesagt ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Abgesagt</span>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${VERLAUF_COLORS[e.verlauf] ?? "bg-gray-100 text-gray-700"}`}>
                          {VERLAUF_LABELS[e.verlauf] ?? e.verlauf}
                        </span>
                      )}
                      {e.abgerechnet && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">✓ Abgerechnet</span>}
                    </div>
                  </div>
                  {e.inhalt && <p className="mt-1 text-xs text-gray-500 line-clamp-2">{e.inhalt}</p>}
                  <div className="text-xs text-gray-400 mt-1">{e.dauer_min} Min.</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Neue Therapie */}
      {showNeuForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold">Neue Therapie anlegen</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Therapieart *</label>
              <div className="grid grid-cols-3 gap-2">
                {THERAPIEARTEN.map(a => (
                  <button
                    key={a.value}
                    onClick={() => setForm(f => ({ ...f, therapieart: a.value }))}
                    className={`p-2 rounded-lg border text-sm text-center transition-colors ${form.therapieart === a.value ? "border-blue-500 bg-blue-50 text-blue-700 font-medium" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div>{a.emoji}</div>
                    <div className="text-xs mt-0.5">{a.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Therapeut/in</label>
                <input value={form.therapeut_name} onChange={e => setForm(f => ({ ...f, therapeut_name: e.target.value }))} placeholder="Name" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequenz</label>
                <input value={form.frequenz} onChange={e => setForm(f => ({ ...f, frequenz: e.target.value }))} placeholder="z.B. 2x wöchentlich" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Therapieziel</label>
              <textarea value={form.ziel} onChange={e => setForm(f => ({ ...f, ziel: e.target.value }))} rows={2} placeholder="Was soll erreicht werden?" className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beginn</label>
                <input type="date" value={form.beginn_datum} onChange={e => setForm(f => ({ ...f, beginn_datum: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ende (optional)</label>
                <input type="date" value={form.ende_datum} onChange={e => setForm(f => ({ ...f, ende_datum: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
              <textarea value={form.notizen} onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowNeuForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Abbrechen</button>
              <button onClick={handleSaveTherapie} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Speichern…" : "Therapie anlegen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Neue Einheit */}
      {showEinheitForm && selectedTherapie && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold">Einheit dokumentieren</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                <input type="date" value={einheitForm.datum} onChange={e => setEinheitForm(f => ({ ...f, datum: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dauer (Min.)</label>
                <input type="number" value={einheitForm.dauer_min} onChange={e => setEinheitForm(f => ({ ...f, dauer_min: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" min={5} max={120} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verlauf</label>
              <div className="grid grid-cols-5 gap-1">
                {Object.entries(VERLAUF_LABELS).map(([val, lbl]) => (
                  <button key={val} onClick={() => setEinheitForm(f => ({ ...f, verlauf: val }))}
                    className={`px-2 py-1 rounded-lg text-xs border transition-colors ${einheitForm.verlauf === val ? "border-blue-500 bg-blue-50 text-blue-700 font-medium" : "border-gray-200"}`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inhalte der Einheit</label>
              <textarea value={einheitForm.inhalt} onChange={e => setEinheitForm(f => ({ ...f, inhalt: e.target.value }))} rows={2} placeholder="Durchgeführte Übungen, Aktivitäten…" className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zielfortschritt</label>
              <input value={einheitForm.zielfortschritt} onChange={e => setEinheitForm(f => ({ ...f, zielfortschritt: e.target.value }))} placeholder="Fortschritte gegenüber Therapieziel" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={einheitForm.abgesagt} onChange={e => setEinheitForm(f => ({ ...f, abgesagt: e.target.checked }))} className="rounded" />
                Abgesagt
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={einheitForm.abgerechnet} onChange={e => setEinheitForm(f => ({ ...f, abgerechnet: e.target.checked }))} className="rounded" />
                Abgerechnet
              </label>
            </div>

            {einheitForm.abgesagt && (
              <input value={einheitForm.abgesagt_grund} onChange={e => setEinheitForm(f => ({ ...f, abgesagt_grund: e.target.value }))} placeholder="Grund der Absage" className="w-full border rounded-lg px-3 py-2 text-sm" />
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowEinheitForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Abbrechen</button>
              <button onClick={handleSaveEinheit} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Speichern…" : "Einheit speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

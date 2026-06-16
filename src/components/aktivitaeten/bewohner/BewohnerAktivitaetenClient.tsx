"use client";

import { useState } from "react";
import { toast } from "sonner";

const STIMMUNG_LABELS: Record<string, string> = {
  sehr_gut: "😄 Sehr gut",
  gut: "🙂 Gut",
  neutral: "😐 Neutral",
  schlecht: "😞 Schlecht",
  sehr_schlecht: "😢 Sehr schlecht",
};

interface Angebot {
  id: string;
  titel: string;
  kategorie: string;
  wochentag: number | null;
  uhrzeit: string | null;
  dauer_min: number;
  ort: string | null;
}

interface Teilnahme {
  id: string;
  datum: string;
  teilgenommen: boolean;
  stimmung: string | null;
  beobachtungen: string | null;
  abgesagt: boolean;
  angebot?: { titel: string; kategorie: string };
}

interface BewohnerAktivitaetenClientProps {
  bewohnerId: string;
  bewohnerName: string;
  initialTeilnahmen: Teilnahme[];
  initialAngebote: Angebot[];
  stats: { gesamt: number; teilgenommen: number; abgesagt: number; letzteAktivitaet: string | null };
}

export function BewohnerAktivitaetenClient({
  bewohnerId, bewohnerName, initialTeilnahmen, initialAngebote, stats: initialStats,
}: BewohnerAktivitaetenClientProps) {
  const [teilnahmen, setTeilnahmen] = useState<Teilnahme[]>(initialTeilnahmen);
  const [stats, setStats] = useState(initialStats);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    angebot_id: "",
    datum: new Date().toISOString().slice(0, 10),
    teilgenommen: true,
    stimmung: "",
    beobachtungen: "",
    abgesagt: false,
    abgesagt_grund: "",
  });

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/bewohner/${bewohnerId}/aktivitaeten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, stimmung: form.stimmung || null }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      const angebot = initialAngebote.find(a => a.id === form.angebot_id);
      const neu: Teilnahme = { ...json.teilnahme, angebot };
      setTeilnahmen(prev => [neu, ...prev]);
      setStats(s => ({
        ...s,
        gesamt: s.gesamt + 1,
        teilgenommen: form.teilgenommen ? s.teilgenommen + 1 : s.teilgenommen,
        abgesagt: form.abgesagt ? s.abgesagt + 1 : s.abgesagt,
      }));
      setShowForm(false);
      toast.success("Teilnahme eingetragen");
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  const teilnahmeRate = stats.gesamt > 0 ? Math.round((stats.teilgenommen / stats.gesamt) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Aktivitäten & Soziale Teilhabe</h1>
          <p className="text-gray-500">{bewohnerName}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium">
          + Teilnahme eintragen
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-purple-50 text-purple-700 rounded-xl p-4">
          <div className="text-2xl font-bold">{stats.gesamt}</div>
          <div className="text-sm font-medium">Einträge gesamt</div>
        </div>
        <div className="bg-green-50 text-green-700 rounded-xl p-4">
          <div className="text-2xl font-bold">{stats.teilgenommen}</div>
          <div className="text-sm font-medium">Teilgenommen</div>
        </div>
        <div className="bg-blue-50 text-blue-700 rounded-xl p-4">
          <div className="text-2xl font-bold">{teilnahmeRate}%</div>
          <div className="text-sm font-medium">Teilnahmequote</div>
        </div>
        <div className="bg-orange-50 text-orange-700 rounded-xl p-4">
          <div className="text-sm font-medium mb-1">Letzte Aktivität</div>
          <div className="text-sm font-bold">
            {stats.letzteAktivitaet ? new Date(stats.letzteAktivitaet).toLocaleDateString("de-DE") : "–"}
          </div>
        </div>
      </div>

      {/* Teilnahme-Liste */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700">Verlauf</h2>
        {teilnahmen.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-400">
            Noch keine Teilnahmen eingetragen
          </div>
        ) : (
          <div className="space-y-2">
            {teilnahmen.map(t => (
              <div key={t.id} className={`bg-white border rounded-xl p-4 flex items-start gap-4 ${!t.teilgenommen ? "opacity-60" : ""}`}>
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${t.teilgenommen ? "bg-green-500" : t.abgesagt ? "bg-red-400" : "bg-gray-300"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{t.angebot?.titel ?? "–"}</p>
                    {t.stimmung && <span className="text-xs">{STIMMUNG_LABELS[t.stimmung] ?? t.stimmung}</span>}
                    {t.abgesagt && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Abgesagt</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(t.datum).toLocaleDateString("de-DE")}</p>
                  {t.beobachtungen && <p className="text-sm text-gray-600 mt-1">{t.beobachtungen}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">Teilnahme eintragen</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Angebot *</label>
              <select value={form.angebot_id} onChange={e => setForm(f => ({ ...f, angebot_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Angebot auswählen…</option>
                {initialAngebote.map(a => (
                  <option key={a.id} value={a.id}>{a.titel}{a.uhrzeit ? ` (${a.uhrzeit} Uhr)` : ""}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
              <input type="date" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setForm(f => ({ ...f, teilgenommen: true, abgesagt: false }))}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${form.teilgenommen ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 hover:border-gray-300"}`}>
                ✓ Teilgenommen
              </button>
              <button onClick={() => setForm(f => ({ ...f, teilgenommen: false, abgesagt: true }))}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${form.abgesagt ? "border-red-400 bg-red-50 text-red-700" : "border-gray-200 hover:border-gray-300"}`}>
                ✗ Abgesagt
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stimmung</label>
              <div className="grid grid-cols-5 gap-1">
                {Object.entries(STIMMUNG_LABELS).map(([val, lbl]) => (
                  <button key={val} onClick={() => setForm(f => ({ ...f, stimmung: val }))}
                    className={`py-2 text-sm rounded-lg border transition-colors ${form.stimmung === val ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-gray-300"}`}>
                    {lbl.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beobachtungen</label>
              <textarea value={form.beobachtungen} onChange={e => setForm(f => ({ ...f, beobachtungen: e.target.value }))}
                rows={2} placeholder="z.B. Hat aktiv mitgemacht, wirkte aufgeschlossen…"
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
            </div>

            {form.abgesagt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Absagegrund</label>
                <input value={form.abgesagt_grund} onChange={e => setForm(f => ({ ...f, abgesagt_grund: e.target.value }))}
                  placeholder="z.B. Unwohlsein, Arzttermin…" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Abbrechen</button>
              <button onClick={handleSave} disabled={saving || !form.angebot_id}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
                {saving ? "Speichern…" : "Eintragen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

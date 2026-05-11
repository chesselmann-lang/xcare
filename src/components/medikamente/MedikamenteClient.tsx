"use client";
import { useState } from "react";
import { Plus, Pill, Clock, Edit2, X, CheckCircle } from "lucide-react";

interface Medikament {
  id: string;
  medikament_name: string;
  wirkstoff?: string | null;
  staerke?: string | null;
  darreichungsform?: string | null;
  dosierung_morgens?: number | null;
  dosierung_mittags?: number | null;
  dosierung_abends?: number | null;
  dosierung_nachts?: number | null;
  einheit?: string | null;
  mit_mahlzeit?: boolean | null;
  dauermedikation?: boolean | null;
  von_datum?: string | null;
  bis_datum?: string | null;
  verordnet_von?: string | null;
  indikation?: string | null;
  hinweise?: string | null;
  aktiv?: boolean | null;
}

interface Props {
  medikamente: Medikament[];
  isAnbieter: boolean;
  familieProfileId?: string;
}

const EINHEITEN = ["Tablette(n)", "Kapsel(n)", "ml", "Tropfen", "Hub/Sprühstoß", "Einheit(en)", "Pflaster", "Zäpfchen"];

const DARREICHUNGSFORMEN = ["Tablette", "Kapsel", "Lösung", "Sirup", "Inhalation", "Injektion", "Pflaster", "Creme/Salbe", "Zäpfchen", "Tropfen"];

function DosierungBadge({ label, value, einheit }: { label: string; value?: number | null; einheit?: string | null }) {
  if (!value) return null;
  return (
    <div className="text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold text-gray-800">{value}</div>
      <div className="text-xs text-gray-400">{einheit ?? "T"}</div>
    </div>
  );
}

export default function MedikamenteClient({ medikamente: initial, isAnbieter, familieProfileId }: Props) {
  const [medikamente, setMedikamente] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<"aktiv" | "alle">("aktiv");

  const [form, setForm] = useState({
    medikament_name: "",
    wirkstoff: "",
    staerke: "",
    darreichungsform: "Tablette",
    dosierung_morgens: "",
    dosierung_mittags: "",
    dosierung_abends: "",
    dosierung_nachts: "",
    einheit: "Tablette(n)",
    mit_mahlzeit: false,
    dauermedikation: true,
    von_datum: "",
    bis_datum: "",
    verordnet_von: "",
    indikation: "",
    hinweise: "",
  });

  const displayed = filter === "aktiv" ? medikamente.filter((m) => m.aktiv !== false) : medikamente;

  async function handleSubmit() {
    if (!form.medikament_name) return;
    setSaving(true);
    setMsg(null);
    try {
      const body = {
        ...form,
        dosierung_morgens: form.dosierung_morgens ? parseFloat(form.dosierung_morgens) : undefined,
        dosierung_mittags: form.dosierung_mittags ? parseFloat(form.dosierung_mittags) : undefined,
        dosierung_abends: form.dosierung_abends ? parseFloat(form.dosierung_abends) : undefined,
        dosierung_nachts: form.dosierung_nachts ? parseFloat(form.dosierung_nachts) : undefined,
        von_datum: form.von_datum || undefined,
        bis_datum: form.bis_datum || undefined,
        ...(isAnbieter && familieProfileId ? { familie_profile_id: familieProfileId } : {}),
      };
      const res = await fetch("/api/medikamente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const entry = await res.json();
      setMedikamente((prev) => [...prev, entry]);
      setForm({ medikament_name: "", wirkstoff: "", staerke: "", darreichungsform: "Tablette", dosierung_morgens: "", dosierung_mittags: "", dosierung_abends: "", dosierung_nachts: "", einheit: "Tablette(n)", mit_mahlzeit: false, dauermedikation: true, von_datum: "", bis_datum: "", verordnet_von: "", indikation: "", hinweise: "" });
      setShowForm(false);
      setMsg("✓ Medikament hinzugefügt");
    } catch {
      setMsg("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  // Generate print-friendly dosing schedule
  const hasDosierung = (m: Medikament) =>
    m.dosierung_morgens || m.dosierung_mittags || m.dosierung_abends || m.dosierung_nachts;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("aktiv")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === "aktiv" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Aktive Medikamente ({medikamente.filter((m) => m.aktiv !== false).length})
          </button>
          <button
            onClick={() => setFilter("alle")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === "alle" ? "bg-gray-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Alle
          </button>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} /> Medikament hinzufügen
        </button>
      </div>

      {msg && (
        <div className={`text-sm px-4 py-2 rounded-lg ${msg.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {msg}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Neues Medikament</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600">Medikament-Name *</label>
              <input type="text" value={form.medikament_name} onChange={(e) => setForm((f) => ({ ...f, medikament_name: e.target.value }))}
                placeholder="z.B. Metoprolol" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Wirkstoff</label>
              <input type="text" value={form.wirkstoff} onChange={(e) => setForm((f) => ({ ...f, wirkstoff: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Stärke</label>
              <input type="text" value={form.staerke} onChange={(e) => setForm((f) => ({ ...f, staerke: e.target.value }))}
                placeholder="z.B. 50mg" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Darreichungsform</label>
              <select value={form.darreichungsform} onChange={(e) => setForm((f) => ({ ...f, darreichungsform: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {DARREICHUNGSFORMEN.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Einheit</label>
              <select value={form.einheit} onChange={(e) => setForm((f) => ({ ...f, einheit: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {EINHEITEN.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-medium text-gray-600 mb-2">Dosierung (Einheiten pro Tageszeit)</div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { key: "dosierung_morgens", label: "Morgens" },
                { key: "dosierung_mittags", label: "Mittags" },
                { key: "dosierung_abends", label: "Abends" },
                { key: "dosierung_nachts", label: "Nachts" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500">{label}</label>
                  <input type="number" min={0} step={0.25}
                    value={(form as Record<string, unknown>)[key] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-2 text-sm text-center" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Verordnet von</label>
              <input type="text" value={form.verordnet_von} onChange={(e) => setForm((f) => ({ ...f, verordnet_von: e.target.value }))}
                placeholder="Dr. Mustermann" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Indikation</label>
              <input type="text" value={form.indikation} onChange={(e) => setForm((f) => ({ ...f, indikation: e.target.value }))}
                placeholder="Bluthochdruck" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Von</label>
              <input type="date" value={form.von_datum} onChange={(e) => setForm((f) => ({ ...f, von_datum: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Bis (leer = dauerhaft)</label>
              <input type="date" value={form.bis_datum} onChange={(e) => setForm((f) => ({ ...f, bis_datum: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600">Hinweise</label>
              <textarea rows={2} value={form.hinweise} onChange={(e) => setForm((f) => ({ ...f, hinweise: e.target.value }))}
                placeholder="z.B. mit einem Glas Wasser, nüchtern nehmen..."
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.mit_mahlzeit} onChange={(e) => setForm((f) => ({ ...f, mit_mahlzeit: e.target.checked }))} className="rounded" />
              Mit Mahlzeit
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.dauermedikation} onChange={(e) => setForm((f) => ({ ...f, dauermedikation: e.target.checked }))} className="rounded" />
              Dauermedikation
            </label>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} disabled={saving || !form.medikament_name}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Speichern…" : "Speichern"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Medikamente List */}
      {displayed.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          Keine Medikamente eingetragen
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((m) => (
            <div key={m.id} className={`bg-white rounded-xl border overflow-hidden ${m.aktiv === false ? "border-gray-200 opacity-60" : "border-gray-200"}`}>
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <Pill size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{m.medikament_name}</div>
                      <div className="text-sm text-gray-500">
                        {[m.wirkstoff, m.staerke, m.darreichungsform].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.dauermedikation && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Dauertherapie</span>
                    )}
                    {m.aktiv === false ? (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <X size={10} /> Inaktiv
                      </span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle size={10} /> Aktiv
                      </span>
                    )}
                  </div>
                </div>

                {hasDosierung(m) && (
                  <div className="mt-4 flex gap-6">
                    <DosierungBadge label="Morgens" value={m.dosierung_morgens} einheit={m.einheit} />
                    <DosierungBadge label="Mittags" value={m.dosierung_mittags} einheit={m.einheit} />
                    <DosierungBadge label="Abends" value={m.dosierung_abends} einheit={m.einheit} />
                    <DosierungBadge label="Nachts" value={m.dosierung_nachts} einheit={m.einheit} />
                    {m.mit_mahlzeit && (
                      <div className="flex items-center text-xs text-gray-400 gap-1 ml-auto self-end">
                        <Clock size={12} /> Mit Mahlzeit
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  {m.indikation && <span>Indikation: {m.indikation}</span>}
                  {m.verordnet_von && <span>Verordnet: {m.verordnet_von}</span>}
                  {m.bis_datum && <span>Bis: {m.bis_datum}</span>}
                </div>
                {m.hinweise && (
                  <div className="mt-2 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">
                    ⚠️ {m.hinweise}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

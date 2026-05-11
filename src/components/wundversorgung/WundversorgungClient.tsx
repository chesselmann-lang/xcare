"use client";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Plus, Activity } from "lucide-react";

interface Wundversorgung {
  id: string;
  wunde_id?: string | null;
  lokalisation: string;
  wundart: string;
  wundgroesse_cm2?: number | null;
  tiefe_grad?: number | null;
  wundzustand?: string | null;
  exsudat?: string | null;
  wundrand?: string | null;
  massnahmen?: string | null;
  verbandsmaterial?: string | null;
  naechster_verbandwechsel?: string | null;
  schmerz_nrs?: number | null;
  notizen?: string | null;
  created_at: string;
}

interface Props {
  versorgungen: Wundversorgung[];
  isAnbieter: boolean;
  familieProfileId?: string;
}

const WUNDART_CONFIG: Record<string, { label: string; color: string }> = {
  dekubitus: { label: "Dekubitus", color: "bg-red-100 text-red-700" },
  ulcus_cruris: { label: "Ulcus cruris", color: "bg-orange-100 text-orange-700" },
  diabetisches_fusssyndrom: { label: "Diab. Fußsyndrom", color: "bg-yellow-100 text-yellow-700" },
  traumatisch: { label: "Traumatisch", color: "bg-blue-100 text-blue-700" },
  operativ: { label: "Operativ", color: "bg-purple-100 text-purple-700" },
  sonstige: { label: "Sonstige", color: "bg-gray-100 text-gray-700" },
};

const ZUSTAND_COLORS: Record<string, string> = {
  granulierend: "text-green-700 bg-green-50",
  epithelisierend: "text-teal-700 bg-teal-50",
  nekrotisch: "text-gray-700 bg-gray-100",
  infiziert: "text-red-700 bg-red-50",
  exsudierend: "text-yellow-700 bg-yellow-50",
  trocken: "text-blue-700 bg-blue-50",
};

export default function WundversorgungClient({ versorgungen: initial, isAnbieter, familieProfileId }: Props) {
  const [versorgungen, setVersorgungen] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedWunde, setSelectedWunde] = useState<string | null>(null);

  const [form, setForm] = useState({
    lokalisation: "",
    wundart: "sonstige" as Wundversorgung["wundart"],
    wundgroesse_cm2: "",
    tiefe_grad: "",
    wundzustand: "",
    exsudat: "",
    wundrand: "",
    massnahmen: "",
    verbandsmaterial: "",
    naechster_verbandwechsel: "",
    schmerz_nrs: "",
    notizen: "",
    wunde_id: "",
  });

  // Group by wunde_id (or id for first entries)
  const wunden = versorgungen.reduce<Record<string, Wundversorgung[]>>((acc, v) => {
    const key = v.wunde_id ?? v.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {});

  async function handleSubmit() {
    if (!form.lokalisation) return;
    setSaving(true);
    setMsg(null);
    try {
      const body = {
        ...form,
        wundgroesse_cm2: form.wundgroesse_cm2 ? parseFloat(form.wundgroesse_cm2) : undefined,
        tiefe_grad: form.tiefe_grad ? parseInt(form.tiefe_grad) : undefined,
        schmerz_nrs: form.schmerz_nrs ? parseInt(form.schmerz_nrs) : undefined,
        wundzustand: form.wundzustand || undefined,
        exsudat: form.exsudat || undefined,
        naechster_verbandwechsel: form.naechster_verbandwechsel || undefined,
        wunde_id: form.wunde_id || undefined,
        ...(isAnbieter && familieProfileId ? { familie_profile_id: familieProfileId } : {}),
      };
      const res = await fetch("/api/wundversorgung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const entry = await res.json();
      setVersorgungen((prev) => [entry, ...prev]);
      setForm({ lokalisation: "", wundart: "sonstige", wundgroesse_cm2: "", tiefe_grad: "", wundzustand: "", exsudat: "", wundrand: "", massnahmen: "", verbandsmaterial: "", naechster_verbandwechsel: "", schmerz_nrs: "", notizen: "", wunde_id: "" });
      setShowForm(false);
      setMsg("✓ Wundversorgung dokumentiert");
    } catch {
      setMsg("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  // Get unique wunden (first entry per wunde_id)
  const wundeList = Object.entries(wunden).map(([key, entries]) => {
    const latest = entries[0];
    return { key, latest, count: entries.length };
  });

  const displayedVersorgungen = selectedWunde
    ? versorgungen.filter((v) => (v.wunde_id ?? v.id) === selectedWunde)
    : versorgungen;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {wundeList.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedWunde(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!selectedWunde ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              Alle Wunden ({versorgungen.length})
            </button>
            {wundeList.map(({ key, latest, count }) => (
              <button
                key={key}
                onClick={() => setSelectedWunde(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${selectedWunde === key ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {latest.lokalisation} ({count}×)
              </button>
            ))}
          </div>
        )}
        {isAnbieter && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 ml-auto"
          >
            <Plus size={16} /> Wundversorgung dokumentieren
          </button>
        )}
      </div>

      {msg && (
        <div className={`text-sm px-4 py-2 rounded-lg ${msg.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {msg}
        </div>
      )}

      {showForm && isAnbieter && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Neue Wundversorgung dokumentieren</h3>

          {wundeList.length > 0 && (
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600">Folgedokumentation für vorhandene Wunde</label>
              <select value={form.wunde_id} onChange={(e) => {
                const selected = wundeList.find((w) => w.key === e.target.value);
                setForm((f) => ({
                  ...f,
                  wunde_id: e.target.value,
                  lokalisation: e.target.value ? (selected?.latest.lokalisation ?? "") : f.lokalisation,
                  wundart: e.target.value ? ((selected?.latest.wundart ?? "sonstige") as Wundversorgung["wundart"]) : f.wundart,
                }));
              }} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">— neue Wunde anlegen</option>
                {wundeList.map(({ key, latest }) => (
                  <option key={key} value={key}>{latest.lokalisation} ({latest.wundart})</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Lokalisation *</label>
              <input type="text" value={form.lokalisation} onChange={(e) => setForm((f) => ({ ...f, lokalisation: e.target.value }))}
                placeholder="z.B. Sakral, linker Knöchel..." className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Wundart</label>
              <select value={form.wundart} onChange={(e) => setForm((f) => ({ ...f, wundart: e.target.value as Wundversorgung["wundart"] }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {Object.entries(WUNDART_CONFIG).map(([k, { label }]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Wundgröße (cm²)</label>
              <input type="number" min={0} step={0.1} value={form.wundgroesse_cm2}
                onChange={(e) => setForm((f) => ({ ...f, wundgroesse_cm2: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Tiefe (Grad 1-4)</label>
              <select value={form.tiefe_grad} onChange={(e) => setForm((f) => ({ ...f, tiefe_grad: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">—</option>
                {[1,2,3,4].map((g) => <option key={g} value={g}>Grad {g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Wundzustand</label>
              <select value={form.wundzustand} onChange={(e) => setForm((f) => ({ ...f, wundzustand: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">—</option>
                {Object.keys(ZUSTAND_COLORS).map((z) => <option key={z} value={z}>{z.charAt(0).toUpperCase() + z.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Exsudat</label>
              <select value={form.exsudat} onChange={(e) => setForm((f) => ({ ...f, exsudat: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">—</option>
                {["kein","gering","maessig","stark"].map((e) => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Schmerzskala (NRS 0-10)</label>
              <input type="number" min={0} max={10} value={form.schmerz_nrs}
                onChange={(e) => setForm((f) => ({ ...f, schmerz_nrs: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Nächster Verbandwechsel</label>
              <input type="date" value={form.naechster_verbandwechsel}
                onChange={(e) => setForm((f) => ({ ...f, naechster_verbandwechsel: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Verbandsmaterial</label>
              <input type="text" value={form.verbandsmaterial}
                onChange={(e) => setForm((f) => ({ ...f, verbandsmaterial: e.target.value }))}
                placeholder="z.B. Hydrokolloid, PU-Folie..." className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Wundrand</label>
              <input type="text" value={form.wundrand}
                onChange={(e) => setForm((f) => ({ ...f, wundrand: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600">Maßnahmen</label>
              <textarea rows={2} value={form.massnahmen}
                onChange={(e) => setForm((f) => ({ ...f, massnahmen: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600">Notizen</label>
              <textarea rows={2} value={form.notizen}
                onChange={(e) => setForm((f) => ({ ...f, notizen: e.target.value }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} disabled={saving || !form.lokalisation}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Speichern…" : "Dokumentieren"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Versorgungen List */}
      {displayedVersorgungen.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          Keine Wundversorgungen dokumentiert
        </div>
      ) : (
        <div className="space-y-4">
          {displayedVersorgungen.map((v) => {
            const wundCfg = WUNDART_CONFIG[v.wundart] ?? WUNDART_CONFIG.sonstige;
            const zustandCls = v.wundzustand ? ZUSTAND_COLORS[v.wundzustand] ?? "" : "";
            return (
              <div key={v.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                      <Activity size={16} className="text-red-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{v.lokalisation}</div>
                      <div className="text-xs text-gray-500">
                        {format(parseISO(v.created_at), "dd. MMM yyyy", { locale: de })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${wundCfg.color}`}>{wundCfg.label}</span>
                    {v.wundzustand && (
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${zustandCls}`}>{v.wundzustand}</span>
                    )}
                    {v.schmerz_nrs !== null && v.schmerz_nrs !== undefined && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.schmerz_nrs >= 7 ? "bg-red-100 text-red-700" : v.schmerz_nrs >= 4 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                        NRS {v.schmerz_nrs}/10
                      </span>
                    )}
                  </div>
                </div>
                <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {v.wundgroesse_cm2 && <div><span className="text-gray-500">Größe:</span> {v.wundgroesse_cm2} cm²</div>}
                  {v.tiefe_grad && <div><span className="text-gray-500">Grad:</span> {v.tiefe_grad}</div>}
                  {v.exsudat && <div><span className="text-gray-500">Exsudat:</span> {v.exsudat}</div>}
                  {v.naechster_verbandwechsel && <div><span className="text-gray-500">Nächster VW:</span> {v.naechster_verbandwechsel}</div>}
                </div>
                {(v.massnahmen || v.verbandsmaterial || v.notizen) && (
                  <div className="px-5 pb-4 space-y-2 text-sm text-gray-700">
                    {v.verbandsmaterial && <div><span className="text-xs text-gray-500 uppercase">Material: </span>{v.verbandsmaterial}</div>}
                    {v.massnahmen && <div className="whitespace-pre-wrap">{v.massnahmen}</div>}
                    {v.notizen && <div className="italic text-gray-500">{v.notizen}</div>}
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

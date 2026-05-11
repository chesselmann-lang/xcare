"use client";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Plus, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface CareWorker {
  id: string;
  vorname: string;
  nachname: string;
}

interface Protokoll {
  id: string;
  erstellt_am: string;
  allgemeinzustand?: string | null;
  besonderheiten?: string | null;
  offene_aufgaben?: string | null;
  medikamente_status?: string | null;
  vitalwerte_auffaellig?: boolean | null;
  stimmung?: string | null;
  bestaetigt?: boolean | null;
  bestaetigt_am?: string | null;
  familie_profile_id?: string;
  care_workers_von?: { vorname: string; nachname: string } | null;
  care_workers_bis?: { vorname: string; nachname: string } | null;
}

interface Props {
  protokolle: Protokoll[];
  careWorkers?: CareWorker[];
  isAnbieter: boolean;
  familieProfileId?: string;
  familieOptionen?: { id: string; vorname: string; nachname: string }[];
}

const STIMMUNG_CONFIG = {
  gut: { label: "Gut", color: "bg-green-100 text-green-700" },
  mittel: { label: "Mittel", color: "bg-yellow-100 text-yellow-700" },
  schlecht: { label: "Schlecht", color: "bg-red-100 text-red-700" },
  unruhig: { label: "Unruhig", color: "bg-orange-100 text-orange-700" },
};

export default function UebergabeClient({ protokolle: initial, careWorkers = [], isAnbieter, familieProfileId, familieOptionen = [] }: Props) {
  const [protokolle, setProtokolle] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedFamilie, setSelectedFamilie] = useState(familieProfileId ?? "");

  const [form, setForm] = useState({
    familie_profile_id: familieProfileId ?? "",
    care_worker_von: "",
    care_worker_bis: "",
    allgemeinzustand: "",
    besonderheiten: "",
    offene_aufgaben: "",
    medikamente_status: "",
    vitalwerte_auffaellig: false,
    stimmung: "" as "" | "gut" | "mittel" | "schlecht" | "unruhig",
  });

  const displayed = selectedFamilie
    ? protokolle.filter((p) => !p.familie_profile_id || p.familie_profile_id === selectedFamilie)
    : protokolle;

  async function handleSubmit() {
    setSaving(true);
    setMsg(null);
    try {
      const body = {
        ...form,
        stimmung: form.stimmung || undefined,
        care_worker_von: form.care_worker_von || undefined,
        care_worker_bis: form.care_worker_bis || undefined,
        familie_profile_id: form.familie_profile_id || undefined,
      };
      const res = await fetch("/api/uebergabe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const entry = await res.json();
      setProtokolle((prev) => [entry, ...prev]);
      setShowForm(false);
      setMsg("✓ Übergabeprotokoll erstellt");
    } catch {
      setMsg("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {isAnbieter && familieOptionen.length > 0 && (
            <select
              value={selectedFamilie}
              onChange={(e) => setSelectedFamilie(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Alle Familien</option>
              {familieOptionen.map((f) => (
                <option key={f.id} value={f.id}>{f.vorname} {f.nachname}</option>
              ))}
            </select>
          )}
        </div>
        {isAnbieter && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus size={16} /> Neues Protokoll
          </button>
        )}
      </div>

      {msg && (
        <div className={`text-sm px-4 py-2 rounded-lg ${msg.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {msg}
        </div>
      )}

      {/* New Protokoll Form */}
      {showForm && isAnbieter && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Übergabeprotokoll erstellen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {familieOptionen.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-600">Familie *</label>
                <select
                  value={form.familie_profile_id}
                  onChange={(e) => setForm((f) => ({ ...f, familie_profile_id: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">— wählen</option>
                  {familieOptionen.map((f) => (
                    <option key={f.id} value={f.id}>{f.vorname} {f.nachname}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-600">Stimmung</label>
              <select
                value={form.stimmung}
                onChange={(e) => setForm((f) => ({ ...f, stimmung: e.target.value as typeof form.stimmung }))}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— wählen</option>
                <option value="gut">Gut</option>
                <option value="mittel">Mittel</option>
                <option value="schlecht">Schlecht</option>
                <option value="unruhig">Unruhig</option>
              </select>
            </div>
            {careWorkers.length > 0 && (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-600">Pflegekraft (abtretend)</label>
                  <select value={form.care_worker_von} onChange={(e) => setForm((f) => ({ ...f, care_worker_von: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">— wählen</option>
                    {careWorkers.map((w) => <option key={w.id} value={w.id}>{w.vorname} {w.nachname}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Pflegekraft (übernehmend)</label>
                  <select value={form.care_worker_bis} onChange={(e) => setForm((f) => ({ ...f, care_worker_bis: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">— wählen</option>
                    {careWorkers.map((w) => <option key={w.id} value={w.id}>{w.vorname} {w.nachname}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
          <div className="mt-4 space-y-3">
            <Textarea label="Allgemeinzustand" value={form.allgemeinzustand} onChange={(v) => setForm((f) => ({ ...f, allgemeinzustand: v }))} />
            <Textarea label="Besonderheiten" value={form.besonderheiten} onChange={(v) => setForm((f) => ({ ...f, besonderheiten: v }))} />
            <Textarea label="Offene Aufgaben" value={form.offene_aufgaben} onChange={(v) => setForm((f) => ({ ...f, offene_aufgaben: v }))} />
            <Textarea label="Medikamentenstatus" value={form.medikamente_status} onChange={(v) => setForm((f) => ({ ...f, medikamente_status: v }))} />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="vital_auffaellig" checked={form.vitalwerte_auffaellig}
                onChange={(e) => setForm((f) => ({ ...f, vitalwerte_auffaellig: e.target.checked }))}
                className="rounded" />
              <label htmlFor="vital_auffaellig" className="text-sm text-gray-700">Vitalwerte auffällig</label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Speichern…" : "Protokoll erstellen"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Protokoll Liste */}
      {displayed.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          Keine Übergabeprotokolle vorhanden
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((p) => {
            const stimmungCfg = p.stimmung ? STIMMUNG_CONFIG[p.stimmung as keyof typeof STIMMUNG_CONFIG] : null;
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-medium text-gray-800">
                      {format(parseISO(p.erstellt_am), "dd. MMMM yyyy, HH:mm 'Uhr'", { locale: de })}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {p.care_workers_von && `${p.care_workers_von.vorname} ${p.care_workers_von.nachname}`}
                      {p.care_workers_von && p.care_workers_bis && " → "}
                      {p.care_workers_bis && `${p.care_workers_bis.vorname} ${p.care_workers_bis.nachname}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {stimmungCfg && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${stimmungCfg.color}`}>
                        {stimmungCfg.label}
                      </span>
                    )}
                    {p.vitalwerte_auffaellig && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full flex items-center gap-1">
                        <AlertCircle size={10} /> Vitalwerte auffällig
                      </span>
                    )}
                    {p.bestaetigt ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle size={10} /> Bestätigt
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full flex items-center gap-1">
                        <Clock size={10} /> Ausstehend
                      </span>
                    )}
                  </div>
                </div>
                <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {p.allgemeinzustand && <InfoSection label="Allgemeinzustand" value={p.allgemeinzustand} />}
                  {p.medikamente_status && <InfoSection label="Medikamentenstatus" value={p.medikamente_status} />}
                  {p.besonderheiten && <InfoSection label="Besonderheiten" value={p.besonderheiten} span />}
                  {p.offene_aufgaben && <InfoSection label="Offene Aufgaben" value={p.offene_aufgaben} span />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}

function InfoSection({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm text-gray-700 whitespace-pre-wrap">{value}</div>
    </div>
  );
}

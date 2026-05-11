"use client";
import { useState } from "react";
import { AlertTriangle, Phone, User, Shield, Edit2, Check, X, Plus } from "lucide-react";

interface NotfallPlan {
  id?: string;
  blutgruppe?: string | null;
  allergien?: string | null;
  chronische_erkrankungen?: string | null;
  implantate?: string | null;
  dnr_verfuegung?: boolean | null;
  patientenverfuegung_vorhanden?: boolean | null;
  besondere_hinweise?: string | null;
  medikamente_notfall?: string | null;
  krankenhaus_name?: string | null;
  krankenhaus_adresse?: string | null;
  hausarzt_name?: string | null;
  hausarzt_telefon?: string | null;
  krankenkasse?: string | null;
  versicherungsnummer?: string | null;
}

interface NotfallKontakt {
  id: string;
  name: string;
  beziehung: string;
  telefon_1: string;
  telefon_2?: string | null;
  email?: string | null;
  erreichbar_von?: string | null;
  prioritaet: number;
  ist_bevollmaechtigt?: boolean | null;
  notizen?: string | null;
}

interface Props {
  plan: NotfallPlan | null;
  kontakte: NotfallKontakt[];
  isAnbieter: boolean;
  familieProfileId?: string;
}

export default function NotfallClient({ plan: initialPlan, kontakte: initialKontakte, isAnbieter, familieProfileId }: Props) {
  const [plan, setPlan] = useState<NotfallPlan | null>(initialPlan);
  const [kontakte, setKontakte] = useState(initialKontakte);
  const [editPlan, setEditPlan] = useState(false);
  const [showKontaktForm, setShowKontaktForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [planForm, setPlanForm] = useState<NotfallPlan>(plan ?? {});
  const [kontaktForm, setKontaktForm] = useState({
    name: "",
    beziehung: "",
    telefon_1: "",
    telefon_2: "",
    email: "",
    erreichbar_von: "",
    prioritaet: 1,
    ist_bevollmaechtigt: false,
    notizen: "",
  });

  const targetFamilieId = isAnbieter ? familieProfileId : undefined;

  async function savePlan() {
    setSaving(true);
    setMsg(null);
    try {
      const body = {
        ...planForm,
        ...(targetFamilieId ? { familie_profile_id: targetFamilieId } : {}),
      };
      const res = await fetch("/api/notfall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPlan(data);
      setPlanForm(data);
      setEditPlan(false);
      setMsg("✓ Notfallplan gespeichert");
    } catch {
      setMsg("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  async function saveKontakt() {
    if (!kontaktForm.name || !kontaktForm.telefon_1) return;
    setSaving(true);
    setMsg(null);
    try {
      const fid = targetFamilieId ?? (plan as Record<string, unknown>)?.familie_profile_id as string;
      if (!fid) { setMsg("familie_profile_id fehlt"); return; }
      const res = await fetch("/api/notfall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _type: "kontakt", ...kontaktForm, familie_profile_id: fid }),
      });
      if (!res.ok) throw new Error(await res.text());
      const k = await res.json();
      setKontakte((prev) => [...prev, k].sort((a, b) => a.prioritaet - b.prioritaet));
      setKontaktForm({ name: "", beziehung: "", telefon_1: "", telefon_2: "", email: "", erreichbar_von: "", prioritaet: 1, ist_bevollmaechtigt: false, notizen: "" });
      setShowKontaktForm(false);
      setMsg("✓ Kontakt hinzugefügt");
    } catch {
      setMsg("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Emergency Banner */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
        <AlertTriangle className="text-red-500 shrink-0" size={24} />
        <div>
          <div className="font-semibold text-red-700">Notfallplan</div>
          <div className="text-sm text-red-600">
            Diese Informationen sind im Notfall sofort verfügbar. Bitte aktuell halten.
          </div>
        </div>
      </div>

      {msg && (
        <div className={`text-sm px-4 py-2 rounded-lg ${msg.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {msg}
        </div>
      )}

      {/* Notfallplan Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 font-semibold text-gray-800">
            <Shield size={18} className="text-red-500" />
            Medizinische Informationen
          </div>
          {!editPlan ? (
            <button
              onClick={() => { setPlanForm(plan ?? {}); setEditPlan(true); }}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <Edit2 size={14} /> Bearbeiten
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={savePlan} disabled={saving} className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800">
                <Check size={14} /> {saving ? "…" : "Speichern"}
              </button>
              <button onClick={() => setEditPlan(false)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                <X size={14} /> Abbrechen
              </button>
            </div>
          )}
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!editPlan ? (
            <>
              <InfoRow label="Blutgruppe" value={plan?.blutgruppe} />
              <InfoRow label="Allergien" value={plan?.allergien} />
              <InfoRow label="Chronische Erkrankungen" value={plan?.chronische_erkrankungen} span />
              <InfoRow label="Implantate" value={plan?.implantate} />
              <InfoRow
                label="DNR-Verfügung"
                value={plan?.dnr_verfuegung === true ? "Ja" : plan?.dnr_verfuegung === false ? "Nein" : null}
              />
              <InfoRow
                label="Patientenverfügung"
                value={plan?.patientenverfuegung_vorhanden === true ? "Vorhanden" : plan?.patientenverfuegung_vorhanden === false ? "Nicht vorhanden" : null}
              />
              <InfoRow label="Notfallmedikamente" value={plan?.medikamente_notfall} span />
              <InfoRow label="Besondere Hinweise" value={plan?.besondere_hinweise} span />
              <InfoRow label="Krankenhaus" value={plan?.krankenhaus_name} />
              <InfoRow label="Hausarzt" value={plan?.hausarzt_name} />
              <InfoRow label="Hausarzt Tel." value={plan?.hausarzt_telefon} />
              <InfoRow label="Krankenkasse" value={plan?.krankenkasse} />
              <InfoRow label="Versicherungsnr." value={plan?.versicherungsnummer} />
            </>
          ) : (
            <>
              <FormField label="Blutgruppe" value={planForm.blutgruppe ?? ""} onChange={(v) => setPlanForm((f) => ({ ...f, blutgruppe: v }))} />
              <FormField label="Allergien" value={planForm.allergien ?? ""} onChange={(v) => setPlanForm((f) => ({ ...f, allergien: v }))} textarea />
              <FormField label="Chronische Erkrankungen" value={planForm.chronische_erkrankungen ?? ""} onChange={(v) => setPlanForm((f) => ({ ...f, chronische_erkrankungen: v }))} textarea span />
              <FormField label="Implantate / Hilfsmittel" value={planForm.implantate ?? ""} onChange={(v) => setPlanForm((f) => ({ ...f, implantate: v }))} />
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-600">DNR-Verfügung</label>
                <select
                  value={planForm.dnr_verfuegung === true ? "ja" : planForm.dnr_verfuegung === false ? "nein" : ""}
                  onChange={(e) => setPlanForm((f) => ({ ...f, dnr_verfuegung: e.target.value === "ja" ? true : e.target.value === "nein" ? false : undefined }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Unbekannt</option>
                  <option value="ja">Ja</option>
                  <option value="nein">Nein</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-600">Patientenverfügung</label>
                <select
                  value={planForm.patientenverfuegung_vorhanden === true ? "ja" : planForm.patientenverfuegung_vorhanden === false ? "nein" : ""}
                  onChange={(e) => setPlanForm((f) => ({ ...f, patientenverfuegung_vorhanden: e.target.value === "ja" ? true : e.target.value === "nein" ? false : undefined }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Unbekannt</option>
                  <option value="ja">Vorhanden</option>
                  <option value="nein">Nicht vorhanden</option>
                </select>
              </div>
              <FormField label="Notfallmedikamente" value={planForm.medikamente_notfall ?? ""} onChange={(v) => setPlanForm((f) => ({ ...f, medikamente_notfall: v }))} textarea span />
              <FormField label="Besondere Hinweise" value={planForm.besondere_hinweise ?? ""} onChange={(v) => setPlanForm((f) => ({ ...f, besondere_hinweise: v }))} textarea span />
              <FormField label="Krankenhaus Name" value={planForm.krankenhaus_name ?? ""} onChange={(v) => setPlanForm((f) => ({ ...f, krankenhaus_name: v }))} />
              <FormField label="Krankenhaus Adresse" value={planForm.krankenhaus_adresse ?? ""} onChange={(v) => setPlanForm((f) => ({ ...f, krankenhaus_adresse: v }))} />
              <FormField label="Hausarzt Name" value={planForm.hausarzt_name ?? ""} onChange={(v) => setPlanForm((f) => ({ ...f, hausarzt_name: v }))} />
              <FormField label="Hausarzt Telefon" value={planForm.hausarzt_telefon ?? ""} onChange={(v) => setPlanForm((f) => ({ ...f, hausarzt_telefon: v }))} />
              <FormField label="Krankenkasse" value={planForm.krankenkasse ?? ""} onChange={(v) => setPlanForm((f) => ({ ...f, krankenkasse: v }))} />
              <FormField label="Versicherungsnummer" value={planForm.versicherungsnummer ?? ""} onChange={(v) => setPlanForm((f) => ({ ...f, versicherungsnummer: v }))} />
            </>
          )}
        </div>
      </div>

      {/* Notfallkontakte */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 font-semibold text-gray-800">
            <Phone size={18} className="text-blue-500" />
            Notfallkontakte ({kontakte.length})
          </div>
          <button
            onClick={() => setShowKontaktForm((v) => !v)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <Plus size={14} /> Kontakt hinzufügen
          </button>
        </div>

        {showKontaktForm && (
          <div className="p-5 border-b border-gray-100 bg-blue-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Name *" value={kontaktForm.name} onChange={(v) => setKontaktForm((f) => ({ ...f, name: v }))} />
              <FormField label="Beziehung" value={kontaktForm.beziehung} onChange={(v) => setKontaktForm((f) => ({ ...f, beziehung: v }))} />
              <FormField label="Telefon 1 *" value={kontaktForm.telefon_1} onChange={(v) => setKontaktForm((f) => ({ ...f, telefon_1: v }))} />
              <FormField label="Telefon 2" value={kontaktForm.telefon_2} onChange={(v) => setKontaktForm((f) => ({ ...f, telefon_2: v }))} />
              <FormField label="E-Mail" value={kontaktForm.email} onChange={(v) => setKontaktForm((f) => ({ ...f, email: v }))} />
              <FormField label="Erreichbar" value={kontaktForm.erreichbar_von} onChange={(v) => setKontaktForm((f) => ({ ...f, erreichbar_von: v }))} />
              <div>
                <label className="text-xs font-medium text-gray-600">Priorität</label>
                <input
                  type="number" min={1} max={10}
                  value={kontaktForm.prioritaet}
                  onChange={(e) => setKontaktForm((f) => ({ ...f, prioritaet: parseInt(e.target.value) || 1 }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 mt-5">
                <input
                  type="checkbox"
                  id="bevollmaechtigt"
                  checked={kontaktForm.ist_bevollmaechtigt}
                  onChange={(e) => setKontaktForm((f) => ({ ...f, ist_bevollmaechtigt: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="bevollmaechtigt" className="text-sm text-gray-700">Bevollmächtigt</label>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={saveKontakt}
                disabled={saving || !kontaktForm.name || !kontaktForm.telefon_1}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "…" : "Speichern"}
              </button>
              <button onClick={() => setShowKontaktForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {kontakte.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Noch keine Notfallkontakte hinterlegt</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {kontakte.map((k) => (
              <div key={k.id} className="px-5 py-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <User size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{k.name}</span>
                    {k.ist_bevollmaechtigt && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Bevollmächtigt</span>
                    )}
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ml-auto">Priorität {k.prioritaet}</span>
                  </div>
                  {k.beziehung && <div className="text-sm text-gray-500">{k.beziehung}</div>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <a href={`tel:${k.telefon_1}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      <Phone size={12} /> {k.telefon_1}
                    </a>
                    {k.telefon_2 && (
                      <a href={`tel:${k.telefon_2}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                        <Phone size={12} /> {k.telefon_2}
                      </a>
                    )}
                    {k.email && <span className="text-sm text-gray-500">{k.email}</span>}
                  </div>
                  {k.erreichbar_von && <div className="text-xs text-gray-400 mt-1">Erreichbar: {k.erreichbar_von}</div>}
                  {k.notizen && <div className="text-xs text-gray-400 italic mt-1">{k.notizen}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, span }: { label: string; value?: string | null; span?: boolean }) {
  if (!value) return null;
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap">{value}</div>
    </div>
  );
}

function FormField({
  label, value, onChange, textarea, span,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  span?: boolean;
}) {
  const cls = "mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {textarea ? (
        <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  User, Plus, Search, Filter, Phone, Home, Heart,
  ChevronDown, ChevronUp, Edit2, Trash2, X, Check,
  AlertTriangle, Activity, ClipboardList
} from "lucide-react";

type Bewohner = {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  geschlecht: string;
  zimmer_nr: string;
  station?: string;
  status: string;
  pflegegrad?: number;
  aufnahmedatum: string;
  mobilitaet: string;
  kommunikation: string;
  notfallkontakt_name?: string;
  notfallkontakt_telefon?: string;
  created_at: string;
};

type Props = {
  initialBewohner: Bewohner[];
};

const STATUS_COLORS: Record<string, string> = {
  aktiv: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  beurlaubt: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  hospitalisiert: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  entlassen: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  verstorben: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  aktiv: "Aktiv",
  beurlaubt: "Beurlaubt",
  hospitalisiert: "Hospitalisiert",
  entlassen: "Entlassen",
  verstorben: "Verstorben",
};

const PFLEGEGRAD_COLORS = ["", "bg-blue-200", "bg-yellow-200", "bg-orange-200", "bg-red-200", "bg-purple-200"];

function getAlter(geburtsdatum: string): number {
  const today = new Date();
  const birth = new Date(geburtsdatum);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const EMPTY_FORM = {
  vorname: "", nachname: "", geburtsdatum: "", geschlecht: "unbekannt",
  zimmer_nr: "", station: "", aufnahmedatum: new Date().toISOString().split("T")[0],
  status: "aktiv", pflegegrad: "", pflegegrad_seit: "",
  mobilitaet: "selbststaendig", kommunikation: "uneingeschraenkt",
  orientierung: "vollstaendig", notfallkontakt_name: "", notfallkontakt_telefon: "",
  krankenkasse: "", versicherungsnummer: "", pflegekasse: "",
  ernaehrungsbesonderheiten: "", medikamenten_hinweis: "",
  religion: "", sprache: "Deutsch", notizen: "",
};

export function BewohnerClient({ initialBewohner }: Props) {
  const [bewohner, setBewohner] = useState<Bewohner[]>(initialBewohner);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("aktiv");
  const [filterPflegegrad, setFilterPflegegrad] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = bewohner.filter((b) => {
    if (filterStatus && b.status !== filterStatus) return false;
    if (filterPflegegrad && String(b.pflegegrad) !== filterPflegegrad) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        b.vorname.toLowerCase().includes(q) ||
        b.nachname.toLowerCase().includes(q) ||
        b.zimmer_nr.toLowerCase().includes(q) ||
        (b.station ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openNew = () => {
    setForm({ ...EMPTY_FORM });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (b: Bewohner) => {
    setForm({
      ...EMPTY_FORM,
      vorname: b.vorname,
      nachname: b.nachname,
      geburtsdatum: b.geburtsdatum,
      geschlecht: b.geschlecht,
      zimmer_nr: b.zimmer_nr,
      station: b.station ?? "",
      aufnahmedatum: b.aufnahmedatum,
      status: b.status,
      pflegegrad: b.pflegegrad ? String(b.pflegegrad) : "",
      mobilitaet: b.mobilitaet,
      kommunikation: b.kommunikation,
      notfallkontakt_name: b.notfallkontakt_name ?? "",
      notfallkontakt_telefon: b.notfallkontakt_telefon ?? "",
      orientierung: "vollstaendig",
      pflegegrad_seit: "",
      krankenkasse: "", versicherungsnummer: "", pflegekasse: "",
      ernaehrungsbesonderheiten: "", medikamenten_hinweis: "",
      religion: "", sprache: "Deutsch", notizen: "",
    });
    setEditId(b.id);
    setShowForm(true);
  };

  const handleSave = useCallback(async () => {
    if (!form.vorname || !form.nachname || !form.geburtsdatum || !form.zimmer_nr) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        pflegegrad: form.pflegegrad ? parseInt(form.pflegegrad) : undefined,
      };
      const url = editId ? `/api/bewohner/${editId}` : "/api/bewohner";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved: Bewohner = await res.json();
      if (editId) {
        setBewohner((prev) => prev.map((b) => (b.id === editId ? { ...b, ...saved } : b)));
        toast.success("Bewohner aktualisiert");
      } else {
        setBewohner((prev) => [saved, ...prev]);
        toast.success("Bewohner hinzugefügt");
      }
      setShowForm(false);
      setEditId(null);
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }, [form, editId]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/bewohner/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setBewohner((prev) => prev.filter((b) => b.id !== id));
      toast.success("Bewohner gelöscht");
    } catch {
      toast.error("Fehler beim Löschen");
    } finally {
      setDeleteId(null);
    }
  };

  const inputCls = "w-full rounded-lg border border-[--border] bg-[--card] px-3 py-2 text-sm focus:ring-2 focus:ring-[--primary] outline-none";
  const selectCls = inputCls;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {["aktiv", "beurlaubt", "hospitalisiert", "entlassen"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
            className={`rounded-xl border p-4 text-left transition-all ${filterStatus === s ? "border-[--primary] bg-[--primary]/5" : "border-[--border] bg-[--card] hover:border-[--primary]/50"}`}
          >
            <p className="text-2xl font-bold">{bewohner.filter((b) => b.status === s).length}</p>
            <p className="text-xs text-[--muted-foreground] mt-1">{STATUS_LABELS[s]}</p>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--muted-foreground]" />
          <input
            placeholder="Name oder Zimmer suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} pl-9`}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[--muted-foreground]" />
          <select value={filterPflegegrad} onChange={(e) => setFilterPflegegrad(e.target.value)} className={`${selectCls} w-36`}>
            <option value="">Alle PG</option>
            {[1, 2, 3, 4, 5].map((pg) => (
              <option key={pg} value={String(pg)}>Pflegegrad {pg}</option>
            ))}
          </select>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-[--primary] text-white px-4 py-2 text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" />
          Bewohner
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[--card] border border-[--border] rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[--border]">
              <h3 className="font-semibold text-lg">{editId ? "Bewohner bearbeiten" : "Neuer Bewohner"}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Vorname *</label>
                  <input value={form.vorname} onChange={(e) => setForm((f) => ({ ...f, vorname: e.target.value }))} className={inputCls} placeholder="Max" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Nachname *</label>
                  <input value={form.nachname} onChange={(e) => setForm((f) => ({ ...f, nachname: e.target.value }))} className={inputCls} placeholder="Mustermann" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Geburtsdatum *</label>
                  <input type="date" value={form.geburtsdatum} onChange={(e) => setForm((f) => ({ ...f, geburtsdatum: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Geschlecht</label>
                  <select value={form.geschlecht} onChange={(e) => setForm((f) => ({ ...f, geschlecht: e.target.value }))} className={selectCls}>
                    <option value="maennlich">Männlich</option>
                    <option value="weiblich">Weiblich</option>
                    <option value="divers">Divers</option>
                    <option value="unbekannt">Unbekannt</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Zimmer-Nr. *</label>
                  <input value={form.zimmer_nr} onChange={(e) => setForm((f) => ({ ...f, zimmer_nr: e.target.value }))} className={inputCls} placeholder="101A" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Station</label>
                  <input value={form.station} onChange={(e) => setForm((f) => ({ ...f, station: e.target.value }))} className={inputCls} placeholder="Station 1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Aufnahmedatum</label>
                  <input type="date" value={form.aufnahmedatum} onChange={(e) => setForm((f) => ({ ...f, aufnahmedatum: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Status</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={selectCls}>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Pflegegrad</label>
                  <select value={form.pflegegrad} onChange={(e) => setForm((f) => ({ ...f, pflegegrad: e.target.value }))} className={selectCls}>
                    <option value="">Kein</option>
                    {[1, 2, 3, 4, 5].map((pg) => <option key={pg} value={String(pg)}>Pflegegrad {pg}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Mobilität</label>
                  <select value={form.mobilitaet} onChange={(e) => setForm((f) => ({ ...f, mobilitaet: e.target.value }))} className={selectCls}>
                    <option value="selbststaendig">Selbstständig</option>
                    <option value="hilfsmittel">Mit Hilfsmittel</option>
                    <option value="eingeschraenkt">Eingeschränkt</option>
                    <option value="bettlaegerig">Bettlägerig</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Kommunikation</label>
                  <select value={form.kommunikation} onChange={(e) => setForm((f) => ({ ...f, kommunikation: e.target.value }))} className={selectCls}>
                    <option value="uneingeschraenkt">Uneingeschränkt</option>
                    <option value="eingeschraenkt">Eingeschränkt</option>
                    <option value="nonverbal">Nonverbal</option>
                    <option value="keine">Keine</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Orientierung</label>
                  <select value={form.orientierung} onChange={(e) => setForm((f) => ({ ...f, orientierung: e.target.value }))} className={selectCls}>
                    <option value="vollstaendig">Vollständig</option>
                    <option value="eingeschraenkt">Eingeschränkt</option>
                    <option value="desorientiert">Desorientiert</option>
                  </select>
                </div>
              </div>
              <div className="border-t border-[--border] pt-4">
                <p className="text-sm font-medium mb-3">Notfallkontakt</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Name</label>
                    <input value={form.notfallkontakt_name} onChange={(e) => setForm((f) => ({ ...f, notfallkontakt_name: e.target.value }))} className={inputCls} placeholder="Maria Mustermann" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Telefon</label>
                    <input value={form.notfallkontakt_telefon} onChange={(e) => setForm((f) => ({ ...f, notfallkontakt_telefon: e.target.value }))} className={inputCls} placeholder="+49 123 456789" />
                  </div>
                </div>
              </div>
              <div className="border-t border-[--border] pt-4">
                <p className="text-sm font-medium mb-3">Versicherung</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Krankenkasse</label>
                    <input value={form.krankenkasse} onChange={(e) => setForm((f) => ({ ...f, krankenkasse: e.target.value }))} className={inputCls} placeholder="AOK Bayern" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Pflegekasse</label>
                    <input value={form.pflegekasse} onChange={(e) => setForm((f) => ({ ...f, pflegekasse: e.target.value }))} className={inputCls} placeholder="AOK Pflegekasse" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Ernährungsbesonderheiten</label>
                <textarea value={form.ernaehrungsbesonderheiten} onChange={(e) => setForm((f) => ({ ...f, ernaehrungsbesonderheiten: e.target.value }))} className={`${inputCls} resize-none`} rows={2} placeholder="Vegetarisch, Diabetikerkost, Schluckstörung…" />
              </div>
              <div>
                <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Medikamentenhinweise</label>
                <textarea value={form.medikamenten_hinweis} onChange={(e) => setForm((f) => ({ ...f, medikamenten_hinweis: e.target.value }))} className={`${inputCls} resize-none`} rows={2} placeholder="Besonderheiten zur Medikamentengabe…" />
              </div>
              <div>
                <label className="text-xs font-medium text-[--muted-foreground] mb-1 block">Notizen</label>
                <textarea value={form.notizen} onChange={(e) => setForm((f) => ({ ...f, notizen: e.target.value }))} className={`${inputCls} resize-none`} rows={3} placeholder="Weitere Hinweise…" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-[--border]">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-[--border] text-sm hover:bg-[--muted]/20">Abbrechen</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-[--primary] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? "Speichern…" : editId ? "Aktualisieren" : "Anlegen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[--card] border border-[--border] rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-semibold">Bewohner löschen?</p>
                <p className="text-sm text-[--muted-foreground]">Diese Aktion kann nicht rückgängig gemacht werden.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg border border-[--border] text-sm">Abbrechen</button>
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700">Löschen</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[--border] rounded-2xl">
          <User className="w-12 h-12 text-[--muted-foreground] mx-auto mb-4 opacity-40" />
          <p className="text-[--muted-foreground]">Keine Bewohner gefunden</p>
          <button onClick={openNew} className="mt-4 text-sm text-[--primary] hover:underline">Ersten Bewohner anlegen</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} className="border border-[--border] bg-[--card] rounded-xl overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[--primary]/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-[--primary]" />
                </div>
                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{b.vorname} {b.nachname}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] ?? ""}`}>{STATUS_LABELS[b.status] ?? b.status}</span>
                    {b.pflegegrad && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PFLEGEGRAD_COLORS[b.pflegegrad]}`}>
                        PG {b.pflegegrad}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-[--muted-foreground]">
                    <span className="flex items-center gap-1"><Home className="w-3 h-3" /> Zi. {b.zimmer_nr}{b.station ? ` · ${b.station}` : ""}</span>
                    <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {getAlter(b.geburtsdatum)} J.</span>
                    {b.notfallkontakt_telefon && (
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {b.notfallkontakt_telefon}</span>
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(b)} className="p-2 rounded-lg hover:bg-[--muted]/30" title="Bearbeiten">
                    <Edit2 className="w-4 h-4 text-[--muted-foreground]" />
                  </button>
                  <button onClick={() => setDeleteId(b.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="Löschen">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                  <button onClick={() => setExpandedId(expandedId === b.id ? null : b.id)} className="p-2 rounded-lg hover:bg-[--muted]/30">
                    {expandedId === b.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {/* Expanded details */}
              {expandedId === b.id && (
                <div className="border-t border-[--border] px-4 pb-4 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm bg-[--muted]/5">
                  <div>
                    <p className="text-xs text-[--muted-foreground] mb-1">Geburtsdatum</p>
                    <p>{new Date(b.geburtsdatum).toLocaleDateString("de-DE")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[--muted-foreground] mb-1">Aufnahme</p>
                    <p>{new Date(b.aufnahmedatum).toLocaleDateString("de-DE")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[--muted-foreground] mb-1">Mobilität</p>
                    <p className="capitalize">{b.mobilitaet.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[--muted-foreground] mb-1">Kommunikation</p>
                    <p className="capitalize">{b.kommunikation}</p>
                  </div>
                  {b.notfallkontakt_name && (
                    <div className="col-span-2">
                      <p className="text-xs text-[--muted-foreground] mb-1 flex items-center gap-1"><Heart className="w-3 h-3" /> Notfallkontakt</p>
                      <p>{b.notfallkontakt_name}{b.notfallkontakt_telefon ? ` · ${b.notfallkontakt_telefon}` : ""}</p>
                    </div>
                  )}
                  <div className="col-span-2 sm:col-span-4 pt-2 border-t border-[--border] flex justify-end">
                    <Link
                      href={`/anbieter/bewohner/${b.id}/pflegeakte`}
                      className="inline-flex items-center gap-2 rounded-lg bg-[--primary]/10 text-[--primary] hover:bg-[--primary]/20 px-4 py-2 text-sm font-medium transition-colors"
                    >
                      <ClipboardList className="w-4 h-4" />
                      Pflegeakte öffnen
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer count */}
      <p className="text-xs text-[--muted-foreground] text-right">
        {filtered.length} von {bewohner.length} Bewohnern angezeigt
      </p>
    </div>
  );
}

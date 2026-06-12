"use client";

import { useState, useMemo } from "react";
import { FileText, Plus, Download, CheckCircle, Clock, XCircle, AlertCircle, Pencil, Trash2, Filter, ChevronDown, ChevronUp, Send, Euro } from "lucide-react";

type LN = {
  id: string;
  leistungsdatum: string;
  abrechnungsmonat: string;
  kunde_name: string;
  kunde_adresse: string | null;
  krankenkasse: string | null;
  versicherungsnummer: string | null;
  leistungsart: string;
  leistungsminuten: number | null;
  einheit: string | null;
  einzelpreis_ct: number | null;
  menge: number | null;
  gesamtbetrag_ct: number | null;
  status: string;
  eingereicht_am: string | null;
  genehmigt_am: string | null;
  abrechnungs_referenz: string | null;
  ik_anbieter: string | null;
  ik_kasse: string | null;
  notizen: string | null;
  bewohner_id: string | null;
  tour_einsatz_id: string | null;
  created_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  offen:        { label: "Offen",        color: "bg-gray-100 text-gray-700",   icon: Clock },
  eingereicht:  { label: "Eingereicht",  color: "bg-blue-100 text-blue-700",   icon: Send },
  genehmigt:    { label: "Genehmigt",    color: "bg-green-100 text-green-700", icon: CheckCircle },
  abgelehnt:    { label: "Abgelehnt",    color: "bg-red-100 text-red-700",     icon: XCircle },
  storniert:    { label: "Storniert",    color: "bg-orange-100 text-orange-700", icon: AlertCircle },
};

const EMPTY_FORM = {
  leistungsdatum: new Date().toISOString().split("T")[0],
  abrechnungsmonat: new Date().toISOString().slice(0, 7),
  kunde_name: "",
  kunde_adresse: "",
  krankenkasse: "",
  versicherungsnummer: "",
  leistungsart: "",
  leistungsminuten: "" as string | number,
  einheit: "Minuten",
  einzelpreis_ct: "" as string | number,
  menge: 1,
  status: "offen",
  abrechnungs_referenz: "",
  ik_anbieter: "",
  ik_kasse: "",
  notizen: "",
};

function formatEuro(ct: number | null): string {
  if (ct == null) return "–";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(ct / 100);
}

function formatDate(d: string | null): string {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("de-DE");
}

export function LeistungsnachweisteClient({ initialData }: { initialData: LN[] }) {
  const [entries, setEntries] = useState<LN[]>(initialData);
  const [filterMonat, setFilterMonat] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterKasse, setFilterKasse] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Derived months list for filter dropdown
  const months = useMemo(() => {
    const m = new Set(entries.map((e) => e.abrechnungsmonat));
    return Array.from(m).sort().reverse();
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterMonat && e.abrechnungsmonat !== filterMonat) return false;
      if (filterStatus && e.status !== filterStatus) return false;
      if (filterKasse && !e.krankenkasse?.toLowerCase().includes(filterKasse.toLowerCase())) return false;
      return true;
    });
  }, [entries, filterMonat, filterStatus, filterKasse]);

  // Aggregated totals for filtered view
  const totals = useMemo(() => {
    const offen = filtered.filter((e) => e.status === "offen").length;
    const eingereicht = filtered.filter((e) => e.status === "eingereicht").length;
    const genehmigt = filtered.filter((e) => e.status === "genehmigt").length;
    const gesamtCt = filtered.reduce((s, e) => s + (e.gesamtbetrag_ct ?? 0), 0);
    const genehmigt_ct = filtered.filter((e) => e.status === "genehmigt").reduce((s, e) => s + (e.gesamtbetrag_ct ?? 0), 0);
    return { offen, eingereicht, genehmigt, gesamtCt, genehmigt_ct };
  }, [filtered]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowModal(true);
  }

  function openEdit(e: LN) {
    setEditId(e.id);
    setForm({
      leistungsdatum: e.leistungsdatum,
      abrechnungsmonat: e.abrechnungsmonat,
      kunde_name: e.kunde_name,
      kunde_adresse: e.kunde_adresse ?? "",
      krankenkasse: e.krankenkasse ?? "",
      versicherungsnummer: e.versicherungsnummer ?? "",
      leistungsart: e.leistungsart,
      leistungsminuten: e.leistungsminuten ?? "",
      einheit: e.einheit ?? "Minuten",
      einzelpreis_ct: e.einzelpreis_ct != null ? (e.einzelpreis_ct / 100).toFixed(2) : "",
      menge: e.menge ?? 1,
      status: e.status,
      abrechnungs_referenz: e.abrechnungs_referenz ?? "",
      ik_anbieter: e.ik_anbieter ?? "",
      ik_kasse: e.ik_kasse ?? "",
      notizen: e.notizen ?? "",
    });
    setError("");
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.kunde_name.trim() || !form.leistungsart.trim()) {
      setError("Kundenname und Leistungsart sind Pflichtfelder.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        leistungsminuten: form.leistungsminuten !== "" ? Number(form.leistungsminuten) : undefined,
        einzelpreis_ct: form.einzelpreis_ct !== "" ? Math.round(Number(form.einzelpreis_ct) * 100) : undefined,
        menge: Number(form.menge),
      };

      const url = editId ? `/api/leistungsnachweise/${editId}` : "/api/leistungsnachweise";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      const saved: LN = await res.json();

      setEntries((prev) =>
        editId ? prev.map((e) => (e.id === editId ? saved : e)) : [saved, ...prev]
      );
      setShowModal(false);
    } catch (e) {
      setError(`Fehler: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/leistungsnachweise/${id}`, { method: "DELETE" });
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
    setDeleteId(null);
  }

  async function handleStatusChange(id: string, status: string) {
    const updates: Record<string, string | null> = { status };
    if (status === "eingereicht") updates.eingereicht_am = new Date().toISOString().split("T")[0];
    if (status === "genehmigt") updates.genehmigt_am = new Date().toISOString().split("T")[0];
    const res = await fetch(`/api/leistungsnachweise/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated: LN = await res.json();
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    }
  }

  // CSV export of filtered data
  function exportCSV() {
    const headers = ["Datum", "Monat", "Kunde", "Leistungsart", "Minuten", "Menge", "Einzelpreis (€)", "Gesamt (€)", "Krankenkasse", "Status", "Eingereicht", "Genehmigt", "Referenz"];
    const rows = filtered.map((e) => [
      e.leistungsdatum,
      e.abrechnungsmonat,
      e.kunde_name,
      e.leistungsart,
      e.leistungsminuten ?? "",
      e.menge ?? 1,
      e.einzelpreis_ct != null ? (e.einzelpreis_ct / 100).toFixed(2) : "",
      e.gesamtbetrag_ct != null ? (e.gesamtbetrag_ct / 100).toFixed(2) : "",
      e.krankenkasse ?? "",
      STATUS_CONFIG[e.status]?.label ?? e.status,
      e.eingereicht_am ?? "",
      e.genehmigt_am ?? "",
      e.abrechnungs_referenz ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leistungsnachweise_${filterMonat || "alle"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const f = (key: keyof typeof form, val: unknown) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Offen", value: totals.offen, color: "text-gray-600" },
          { label: "Eingereicht", value: totals.eingereicht, color: "text-blue-600" },
          { label: "Genehmigt", value: totals.genehmigt, color: "text-green-600" },
          { label: "Gesamtbetrag", value: formatEuro(totals.gesamtCt), color: "text-[--primary]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[--card] rounded-xl border border-[--border] p-4">
            <p className="text-xs text-[--muted-foreground] mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-[--muted-foreground]" />
          <select
            value={filterMonat}
            onChange={(e) => setFilterMonat(e.target.value)}
            className="rounded-lg border border-[--border] bg-[--background] px-3 py-1.5 text-sm"
          >
            <option value="">Alle Monate</option>
            {months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-[--border] bg-[--background] px-3 py-1.5 text-sm"
          >
            <option value="">Alle Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Krankenkasse..."
            value={filterKasse}
            onChange={(e) => setFilterKasse(e.target.value)}
            className="rounded-lg border border-[--border] bg-[--background] px-3 py-1.5 text-sm w-40"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-lg border border-[--border] px-3 py-1.5 text-sm hover:bg-[--muted] transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV-Export
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-[--primary] text-white px-4 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Neuer Nachweis
          </button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[--muted-foreground]">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Keine Leistungsnachweise gefunden</p>
          <p className="text-sm mt-1">Erstellen Sie Ihren ersten Nachweis über den Button oben.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => {
            const cfg = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.offen;
            const Icon = cfg.icon;
            const expanded = expandedId === e.id;
            return (
              <div key={e.id} className="bg-[--card] rounded-xl border border-[--border] overflow-hidden">
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[--muted]/30 transition-colors"
                  onClick={() => setExpandedId(expanded ? null : e.id)}
                >
                  <div className="w-10 h-10 rounded-lg bg-[--primary]/10 flex items-center justify-center shrink-0">
                    <Euro className="w-5 h-5 text-[--primary]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{e.kunde_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                        <Icon className="w-3 h-3 inline mr-1" />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-[--muted-foreground] mt-0.5">
                      {e.leistungsart} · {formatDate(e.leistungsdatum)} · {e.abrechnungsmonat}
                      {e.leistungsminuten ? ` · ${e.leistungsminuten} Min.` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm">{formatEuro(e.gesamtbetrag_ct)}</p>
                    {e.krankenkasse && <p className="text-xs text-[--muted-foreground]">{e.krankenkasse}</p>}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                      className="p-1.5 rounded-lg hover:bg-[--muted] text-[--muted-foreground]"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); setDeleteId(e.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-[--muted-foreground] hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expanded ? <ChevronUp className="w-4 h-4 text-[--muted-foreground]" /> : <ChevronDown className="w-4 h-4 text-[--muted-foreground]" />}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-[--border] p-4 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-[--muted-foreground]">Adresse</p>
                        <p>{e.kunde_adresse || "–"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[--muted-foreground]">Vers.-Nr.</p>
                        <p>{e.versicherungsnummer || "–"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[--muted-foreground]">Einzelpreis</p>
                        <p>{formatEuro(e.einzelpreis_ct)} × {e.menge ?? 1}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[--muted-foreground]">Referenz</p>
                        <p>{e.abrechnungs_referenz || "–"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[--muted-foreground]">Eingereicht</p>
                        <p>{formatDate(e.eingereicht_am)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[--muted-foreground]">Genehmigt</p>
                        <p>{formatDate(e.genehmigt_am)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[--muted-foreground]">IK Anbieter</p>
                        <p>{e.ik_anbieter || "–"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[--muted-foreground]">IK Kasse</p>
                        <p>{e.ik_kasse || "–"}</p>
                      </div>
                    </div>
                    {e.notizen && (
                      <p className="text-sm text-[--muted-foreground] italic">{e.notizen}</p>
                    )}
                    {/* Inline status change */}
                    <div className="flex gap-2 flex-wrap">
                      {["offen", "eingereicht", "genehmigt", "abgelehnt", "storniert"].map((s) => (
                        <button
                          key={s}
                          disabled={e.status === s}
                          onClick={() => handleStatusChange(e.id, s)}
                          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                            e.status === s
                              ? `${STATUS_CONFIG[s].color} border-transparent font-semibold`
                              : "border-[--border] hover:bg-[--muted]"
                          }`}
                        >
                          {STATUS_CONFIG[s].label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-[--muted-foreground] text-right">{filtered.length} Einträge · Genehmigt: {formatEuro(totals.genehmigt_ct)}</p>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[--card] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[--border]">
              <h2 className="text-lg font-bold">{editId ? "Leistungsnachweis bearbeiten" : "Neuer Leistungsnachweis"}</h2>
            </div>
            <div className="p-6 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] block mb-1">Leistungsdatum *</label>
                  <input type="date" value={form.leistungsdatum} onChange={(e) => f("leistungsdatum", e.target.value)}
                    className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] block mb-1">Abrechnungsmonat *</label>
                  <input type="month" value={form.abrechnungsmonat} onChange={(e) => f("abrechnungsmonat", e.target.value)}
                    className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[--muted-foreground] block mb-1">Kundenname *</label>
                <input type="text" value={form.kunde_name} onChange={(e) => f("kunde_name", e.target.value)}
                  placeholder="Max Mustermann"
                  className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-[--muted-foreground] block mb-1">Adresse</label>
                <input type="text" value={form.kunde_adresse} onChange={(e) => f("kunde_adresse", e.target.value)}
                  placeholder="Musterstr. 1, 12345 Berlin"
                  className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] block mb-1">Krankenkasse</label>
                  <input type="text" value={form.krankenkasse} onChange={(e) => f("krankenkasse", e.target.value)}
                    placeholder="AOK Bayern"
                    className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] block mb-1">Versicherungsnummer</label>
                  <input type="text" value={form.versicherungsnummer} onChange={(e) => f("versicherungsnummer", e.target.value)}
                    placeholder="A000000000"
                    className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[--muted-foreground] block mb-1">Leistungsart *</label>
                <input type="text" value={form.leistungsart} onChange={(e) => f("leistungsart", e.target.value)}
                  placeholder="z.B. Grundpflege §36 SGB XI"
                  className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] block mb-1">Minuten</label>
                  <input type="number" min={1} max={480} value={form.leistungsminuten}
                    onChange={(e) => f("leistungsminuten", e.target.value)}
                    className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] block mb-1">Einheit</label>
                  <select value={form.einheit} onChange={(e) => f("einheit", e.target.value)}
                    className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm">
                    <option>Minuten</option>
                    <option>Einsatz</option>
                    <option>Stunden</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] block mb-1">Menge</label>
                  <input type="number" min={0.01} step={0.01} value={form.menge}
                    onChange={(e) => f("menge", e.target.value)}
                    className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] block mb-1">Einzelpreis (€)</label>
                  <input type="number" min={0} step={0.01} value={form.einzelpreis_ct}
                    onChange={(e) => f("einzelpreis_ct", e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] block mb-1">Status</label>
                  <select value={form.status} onChange={(e) => f("status", e.target.value)}
                    className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm">
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] block mb-1">IK Anbieter</label>
                  <input type="text" value={form.ik_anbieter} onChange={(e) => f("ik_anbieter", e.target.value)}
                    placeholder="123456789"
                    className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[--muted-foreground] block mb-1">IK Kasse</label>
                  <input type="text" value={form.ik_kasse} onChange={(e) => f("ik_kasse", e.target.value)}
                    placeholder="108018007"
                    className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[--muted-foreground] block mb-1">Abrechnungsreferenz</label>
                <input type="text" value={form.abrechnungs_referenz} onChange={(e) => f("abrechnungs_referenz", e.target.value)}
                  placeholder="RN-2026-001"
                  className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="text-xs font-medium text-[--muted-foreground] block mb-1">Notizen</label>
                <textarea rows={2} value={form.notizen} onChange={(e) => f("notizen", e.target.value)}
                  className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm resize-none" />
              </div>
            </div>
            <div className="p-6 border-t border-[--border] flex justify-end gap-3">
              <button onClick={() => setShowModal(false)}
                className="rounded-lg border border-[--border] px-4 py-2 text-sm hover:bg-[--muted]">
                Abbrechen
              </button>
              <button onClick={handleSave} disabled={saving}
                className="rounded-lg bg-[--primary] text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? "Speichern…" : editId ? "Aktualisieren" : "Erstellen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[--card] rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="font-semibold">Leistungsnachweis löschen?</p>
            <p className="text-sm text-[--muted-foreground]">Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteId(null)}
                className="rounded-lg border border-[--border] px-4 py-2 text-sm hover:bg-[--muted]">Abbrechen</button>
              <button onClick={() => handleDelete(deleteId)}
                className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700">Löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

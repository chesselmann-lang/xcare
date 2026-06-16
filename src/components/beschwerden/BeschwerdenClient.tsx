"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp,
  Plus, Filter, X, TrendingUp, MessageSquare, ArrowUp, RefreshCw
} from "lucide-react";

type Beschwerde = {
  id: string;
  kategorie: string;
  betreff: string;
  beschreibung: string;
  status: string;
  eskalationsstufe: string;
  frist: string | null;
  einreicher_name: string | null;
  einreicher_typ: string;
  erstellt_am: string;
  abgeschlossen_am: string | null;
  bewohner_id: string | null;
  bewohner?: { vorname: string; nachname: string } | null;
};

type Stats = {
  gesamt: number; eingegangen: number; in_bearbeitung: number;
  eskaliert: number; abgeschlossen: number; ueberfaellig: number;
};

type Props = {
  initialBeschwerden: Beschwerde[];
  initialStats: Stats;
  bewohnerListe: { id: string; vorname: string; nachname: string }[];
};

const STATUS_COLORS: Record<string, string> = {
  eingegangen: "bg-blue-100 text-blue-700",
  in_bearbeitung: "bg-amber-100 text-amber-700",
  eskaliert: "bg-red-100 text-red-700",
  abgeschlossen: "bg-green-100 text-green-700",
  abgewiesen: "bg-gray-100 text-gray-700",
};

const STATUS_LABELS: Record<string, string> = {
  eingegangen: "Eingegangen", in_bearbeitung: "In Bearbeitung",
  eskaliert: "Eskaliert", abgeschlossen: "Abgeschlossen", abgewiesen: "Abgewiesen",
};

const KAT_LABELS: Record<string, string> = {
  pflege: "Pflege", personal: "Personal", ernaehrung: "Ernährung",
  sauberkeit: "Sauberkeit", sicherheit: "Sicherheit", kommunikation: "Kommunikation",
  verwaltung: "Verwaltung", raeumlichkeiten: "Räumlichkeiten", sonstiges: "Sonstiges",
};

const ESK_LABELS: Record<string, string> = {
  intern: "Intern", heimleitung: "Heimleitung",
  betreuungsbehoerde: "Betreuungsbehörde", mdk: "MDK", ombudsmann: "Ombudsmann",
};

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[--card] border border-[--border] rounded-xl p-4 text-center">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-[--muted-foreground] mt-1">{label}</div>
    </div>
  );
}

export function BeschwerdenClient({ initialBeschwerden, initialStats, bewohnerListe }: Props) {
  const [beschwerden, setBeschwerden] = useState(initialBeschwerden);
  const [stats, setStats] = useState(initialStats);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [saving, setSaving] = useState(false);

  // Neues Formular
  const [form, setForm] = useState({
    betreff: "", beschreibung: "", kategorie: "sonstiges",
    einreicher_name: "", einreicher_typ: "angehoerige",
    bewohner_id: "", frist: "", vorfall_datum: "",
  });

  // Detail-Bearbeitung
  const [detailForm, setDetailForm] = useState<Record<string, string>>({});

  const reload = async () => {
    const res = await fetch(`/api/beschwerden${statusFilter ? `?status=${statusFilter}` : ""}`);
    if (res.ok) {
      const d = await res.json();
      setBeschwerden(d.beschwerden);
      setStats(d.stats);
    }
  };

  const submit = async () => {
    if (!form.betreff.trim() || !form.beschreibung.trim()) {
      toast.error("Betreff und Beschreibung sind Pflichtfelder");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/beschwerden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Beschwerde eingereicht");
      setShowForm(false);
      setForm({ betreff: "", beschreibung: "", kategorie: "sonstiges", einreicher_name: "", einreicher_typ: "angehoerige", bewohner_id: "", frist: "", vorfall_datum: "" });
      await reload();
    } catch {
      toast.error("Fehler beim Einreichen");
    } finally {
      setSaving(false);
    }
  };

  const updateBeschwerde = async (id: string, patch: Record<string, string>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/beschwerden/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      toast.success("Aktualisiert");
      await reload();
      setDetailForm({});
    } catch {
      toast.error("Fehler");
    } finally {
      setSaving(false);
    }
  };

  const filtered = beschwerden.filter(b => !statusFilter || b.status === statusFilter);
  const isUeberfaellig = (b: Beschwerde) => b.frist && new Date(b.frist) < new Date() && b.status !== "abgeschlossen";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Beschwerdemanagement</h1>
          <p className="text-sm text-[--muted-foreground] mt-1">Beschwerdebearbeitung nach §75 SGB XI</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Beschwerde erfassen
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <StatCard label="Gesamt" value={stats.gesamt} color="text-[--foreground]" />
        <StatCard label="Eingegangen" value={stats.eingegangen} color="text-blue-600" />
        <StatCard label="In Bearbeitung" value={stats.in_bearbeitung} color="text-amber-600" />
        <StatCard label="Eskaliert" value={stats.eskaliert} color="text-red-600" />
        <StatCard label="Abgeschlossen" value={stats.abgeschlossen} color="text-green-600" />
        <StatCard label="Überfällig" value={stats.ueberfaellig} color="text-red-600" />
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["", "eingegangen", "in_bearbeitung", "eskaliert", "abgeschlossen"].map(s => (
          <button key={s} onClick={async () => { setStatusFilter(s); await reload(); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s ? "bg-[--primary] text-[--primary-foreground]" : "border border-[--border] text-[--muted-foreground] hover:bg-[--muted]"
            }`}>
            {s === "" ? "Alle" : STATUS_LABELS[s]}
          </button>
        ))}
        <button onClick={reload} className="ml-auto p-1.5 rounded-lg hover:bg-[--muted] text-[--muted-foreground]">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Beschwerde-Formular Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[--card] rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Neue Beschwerde erfassen</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">Kategorie</label>
                <select value={form.kategorie} onChange={e => setForm(f => ({...f, kategorie: e.target.value}))}
                  className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]">
                  {Object.entries(KAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Einreicher</label>
                <select value={form.einreicher_typ} onChange={e => setForm(f => ({...f, einreicher_typ: e.target.value}))}
                  className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]">
                  <option value="angehoerige">Angehörige/r</option>
                  <option value="bewohner">Bewohner/in</option>
                  <option value="mitarbeiter">Mitarbeiter/in</option>
                  <option value="anonym">Anonym</option>
                </select>
              </div>
            </div>
            {form.einreicher_typ !== "anonym" && (
              <div>
                <label className="text-xs font-medium block mb-1">Name des Einreichers</label>
                <input value={form.einreicher_name} onChange={e => setForm(f => ({...f, einreicher_name: e.target.value}))}
                  className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium block mb-1">Betrifft Bewohner (optional)</label>
              <select value={form.bewohner_id} onChange={e => setForm(f => ({...f, bewohner_id: e.target.value}))}
                className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]">
                <option value="">– kein spezifischer Bewohner –</option>
                {bewohnerListe.map(b => <option key={b.id} value={b.id}>{b.vorname} {b.nachname}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">Vorfall-Datum</label>
                <input type="date" value={form.vorfall_datum} onChange={e => setForm(f => ({...f, vorfall_datum: e.target.value}))}
                  className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Bearbeitungs-Frist</label>
                <input type="date" value={form.frist} onChange={e => setForm(f => ({...f, frist: e.target.value}))}
                  className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Betreff *</label>
              <input value={form.betreff} onChange={e => setForm(f => ({...f, betreff: e.target.value}))}
                className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Beschreibung *</label>
              <textarea value={form.beschreibung} onChange={e => setForm(f => ({...f, beschreibung: e.target.value}))}
                rows={4} className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background] resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-[--border] rounded-lg text-sm hover:bg-[--muted]">Abbrechen</button>
              <button onClick={submit} disabled={saving}
                className="flex-1 px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? "Speichere…" : "Einreichen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[--muted-foreground]">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Keine Beschwerden gefunden.</p>
          </div>
        )}
        {filtered.map(b => {
          const isOpen = expandedId === b.id;
          const overdue = isUeberfaellig(b);
          return (
            <div key={b.id} className={`bg-[--card] border rounded-xl overflow-hidden ${overdue ? "border-red-300" : "border-[--border]"}`}>
              <button
                onClick={() => setExpandedId(isOpen ? null : b.id)}
                className="w-full px-4 py-4 flex items-start gap-3 hover:bg-[--muted]/20 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status]}`}>
                      {STATUS_LABELS[b.status]}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[--muted] text-[--muted-foreground]">
                      {KAT_LABELS[b.kategorie]}
                    </span>
                    {overdue && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-medium">Überfällig!</span>
                    )}
                  </div>
                  <div className="font-medium truncate">{b.betreff}</div>
                  <div className="text-xs text-[--muted-foreground] mt-1 flex gap-3">
                    {b.bewohner && <span>{b.bewohner.vorname} {b.bewohner.nachname}</span>}
                    {b.einreicher_name && <span>von {b.einreicher_name}</span>}
                    <span>{new Date(b.erstellt_am).toLocaleDateString("de-DE")}</span>
                    {b.frist && <span>Frist: {new Date(b.frist).toLocaleDateString("de-DE")}</span>}
                  </div>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-[--muted-foreground] mt-1" /> : <ChevronDown className="h-4 w-4 shrink-0 text-[--muted-foreground] mt-1" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-[--border] pt-4 space-y-4">
                  <p className="text-sm text-[--muted-foreground] whitespace-pre-wrap">{b.beschreibung}</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium block mb-1">Status ändern</label>
                      <select
                        defaultValue={b.status}
                        onChange={e => setDetailForm(f => ({...f, status: e.target.value}))}
                        className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]"
                      >
                        <option value="eingegangen">Eingegangen</option>
                        <option value="in_bearbeitung">In Bearbeitung</option>
                        <option value="eskaliert">Eskaliert</option>
                        <option value="abgeschlossen">Abgeschlossen</option>
                        <option value="abgewiesen">Abgewiesen</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">Eskalationsstufe</label>
                      <select
                        defaultValue={b.eskalationsstufe}
                        onChange={e => setDetailForm(f => ({...f, eskalationsstufe: e.target.value}))}
                        className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]"
                      >
                        {Object.entries(ESK_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium block mb-1">Maßnahmen / Reaktion</label>
                    <textarea
                      defaultValue={""}
                      onChange={e => setDetailForm(f => ({...f, massnahmen: e.target.value}))}
                      rows={3}
                      placeholder="Was wurde unternommen?"
                      className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background] resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium block mb-1">Interne Notiz</label>
                    <textarea
                      onChange={e => setDetailForm(f => ({...f, notiz: e.target.value}))}
                      rows={2}
                      placeholder="Für das Protokoll…"
                      className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background] resize-none"
                    />
                  </div>

                  <button
                    onClick={() => updateBeschwerde(b.id, detailForm)}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {saving ? "Speichere…" : "Aktualisieren"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

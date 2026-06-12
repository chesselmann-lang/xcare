"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Indikator {
  id: string;
  periode: string;
  kategorie: string;
  indikator: string;
  wert: number;
  einheit: string;
  zielwert: number | null;
  bewertung: "gut" | "akzeptabel" | "verbesserungsbedarf" | "kritisch" | "neutral";
  trend: "steigend" | "stabil" | "fallend";
  notiz: string | null;
  quelle: string | null;
  created_at: string;
}

interface Props {
  indikatoren: Indikator[];
  perioden: string[];
  activePeriode: string;
  activeKategorie?: string;
}

const KATEGORIEN = [
  { value: "allgemein", label: "Allgemein" },
  { value: "pflege", label: "Pflege" },
  { value: "dokumentation", label: "Dokumentation" },
  { value: "zufriedenheit", label: "Zufriedenheit" },
  { value: "sicherheit", label: "Sicherheit" },
  { value: "personal", label: "Personal" },
];

const BEWERTUNG_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  gut:                { label: "Gut",                  color: "text-green-700",  bg: "bg-green-100" },
  akzeptabel:         { label: "Akzeptabel",           color: "text-blue-700",   bg: "bg-blue-100" },
  verbesserungsbedarf:{ label: "Verbesserungsbedarf",  color: "text-yellow-700", bg: "bg-yellow-100" },
  kritisch:           { label: "Kritisch",             color: "text-red-700",    bg: "bg-red-100" },
  neutral:            { label: "Neutral",              color: "text-gray-600",   bg: "bg-gray-100" },
};

const TREND_ICON: Record<string, string> = {
  steigend: "↑",
  stabil: "→",
  fallend: "↓",
};

const TREND_COLOR: Record<string, string> = {
  steigend: "text-green-600",
  stabil: "text-gray-500",
  fallend: "text-red-600",
};

const DEFAULT_INDIKATOREN: Array<{ kategorie: string; indikator: string; einheit: string; zielwert: number }> = [
  { kategorie: "pflege",         indikator: "Dekubitusrate (Grad 2+)",         einheit: "%",   zielwert: 2   },
  { kategorie: "pflege",         indikator: "Sturzrate",                        einheit: "%",   zielwert: 5   },
  { kategorie: "pflege",         indikator: "Schmerzbewertung ≥5 NRS",          einheit: "%",   zielwert: 10  },
  { kategorie: "pflege",         indikator: "Freiheitsentziehende Maßnahmen",   einheit: "%",   zielwert: 8   },
  { kategorie: "dokumentation",  indikator: "Pflegedoku-Vollständigkeit",        einheit: "%",   zielwert: 95  },
  { kategorie: "dokumentation",  indikator: "Medikamentendoku-Vollständigkeit",  einheit: "%",   zielwert: 98  },
  { kategorie: "zufriedenheit",  indikator: "Bewohner-/Kundenzufriedenheit",    einheit: "Pkt", zielwert: 4   },
  { kategorie: "zufriedenheit",  indikator: "Beschwerdenquote",                 einheit: "%",   zielwert: 3   },
  { kategorie: "sicherheit",     indikator: "Hygienebegehungen bestanden",      einheit: "%",   zielwert: 100 },
  { kategorie: "sicherheit",     indikator: "Medikationsfehlerrate",            einheit: "%",   zielwert: 1   },
  { kategorie: "personal",       indikator: "Krankenquote",                     einheit: "%",   zielwert: 6   },
  { kategorie: "personal",       indikator: "Fortbildungsquote",                einheit: "%",   zielwert: 80  },
];

function scoreColor(wert: number, zielwert: number | null, bewertung: string) {
  return BEWERTUNG_CONFIG[bewertung] ?? BEWERTUNG_CONFIG.neutral;
}

function ProgressBar({ wert, zielwert, bewertung }: { wert: number; zielwert: number | null; bewertung: string }) {
  if (!zielwert || zielwert <= 0) return null;
  const pct = Math.min(100, Math.round((wert / zielwert) * 100));
  const cfg = scoreColor(wert, zielwert, bewertung);
  const barColor =
    bewertung === "gut" ? "bg-green-500" :
    bewertung === "akzeptabel" ? "bg-blue-400" :
    bewertung === "verbesserungsbedarf" ? "bg-yellow-400" :
    bewertung === "kritisch" ? "bg-red-500" : "bg-gray-300";

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-[--muted-foreground] mb-1">
        <span>{wert}</span>
        <span>Ziel: {zielwert}</span>
      </div>
      <div className="h-2 rounded-full bg-[--muted] overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function QualitaetClient({ indikatoren: initial, perioden, activePeriode, activeKategorie }: Props) {
  const router = useRouter();
  const [indikatoren, setIndikatoren] = useState<Indikator[]>(initial);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    indikator: "",
    kategorie: "allgemein",
    wert: "",
    einheit: "%",
    zielwert: "",
    bewertung: "neutral" as Indikator["bewertung"],
    trend: "stabil" as Indikator["trend"],
    notiz: "",
    quelle: "",
  });

  function resetForm() {
    setForm({ indikator: "", kategorie: "allgemein", wert: "", einheit: "%", zielwert: "", bewertung: "neutral", trend: "stabil", notiz: "", quelle: "" });
    setShowForm(false);
    setShowTemplates(false);
    setEditingId(null);
  }

  function applyTemplate(tpl: typeof DEFAULT_INDIKATOREN[0]) {
    setForm(f => ({ ...f, indikator: tpl.indikator, kategorie: tpl.kategorie, einheit: tpl.einheit, zielwert: String(tpl.zielwert) }));
    setShowTemplates(false);
    setShowForm(true);
  }

  function handlePeriodeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const url = new URL(window.location.href);
    url.searchParams.set("periode", e.target.value);
    router.push(url.pathname + url.search);
  }

  function handleKategorieFilter(kat: string) {
    const url = new URL(window.location.href);
    if (kat) url.searchParams.set("kategorie", kat);
    else url.searchParams.delete("kategorie");
    router.push(url.pathname + url.search);
  }

  async function handleSave() {
    if (!form.indikator.trim() || form.wert === "") return;
    const payload = {
      periode: activePeriode,
      kategorie: form.kategorie,
      indikator: form.indikator.trim(),
      wert: Number(form.wert),
      einheit: form.einheit || "%",
      zielwert: form.zielwert !== "" ? Number(form.zielwert) : undefined,
      bewertung: form.bewertung,
      trend: form.trend,
      notiz: form.notiz || undefined,
      quelle: form.quelle || undefined,
    };

    const res = await fetch("/api/qualitaetsindikatoren", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { toast.error("Fehler beim Speichern"); return; }
    const saved = await res.json() as Indikator;
    setIndikatoren(prev => {
      const idx = prev.findIndex(i => i.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [saved, ...prev];
    });
    toast.success("Indikator gespeichert");
    resetForm();
    startTransition(() => router.refresh());
  }

  async function handleDelete(id: string) {
    setIndikatoren(prev => prev.filter(i => i.id !== id));
    const res = await fetch(`/api/qualitaetsindikatoren/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Löschen fehlgeschlagen");
      startTransition(() => router.refresh());
    } else {
      toast.success("Indikator gelöscht");
    }
  }

  async function handleQuickEdit(id: string, patch: Partial<Pick<Indikator, "bewertung" | "trend" | "wert">>) {
    setIndikatoren(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
    const res = await fetch(`/api/qualitaetsindikatoren/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error("Aktualisierung fehlgeschlagen");
      startTransition(() => router.refresh());
    }
  }

  // Group by category
  const grouped = KATEGORIEN.reduce<Record<string, Indikator[]>>((acc, kat) => {
    acc[kat.value] = indikatoren.filter(i => i.kategorie === kat.value);
    return acc;
  }, {});

  // Summary stats
  const total = indikatoren.length;
  const gut = indikatoren.filter(i => i.bewertung === "gut").length;
  const kritisch = indikatoren.filter(i => i.bewertung === "kritisch").length;
  const verbessern = indikatoren.filter(i => i.bewertung === "verbesserungsbedarf").length;
  const score = total > 0 ? Math.round((gut / total) * 100) : 0;

  const displayKategorien = activeKategorie
    ? KATEGORIEN.filter(k => k.value === activeKategorie)
    : KATEGORIEN;

  return (
    <div className="space-y-6">
      {/* Controls row */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          <label className="text-sm text-[--muted-foreground]">Periode:</label>
          <select
            value={activePeriode}
            onChange={handlePeriodeChange}
            className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--card] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
          >
            {perioden.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={activeKategorie ?? ""}
            onChange={e => handleKategorieFilter(e.target.value)}
            className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--card] text-[--foreground] focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
          >
            <option value="">Alle Kategorien</option>
            {KATEGORIEN.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowTemplates(!showTemplates); setShowForm(false); }}
            className="px-4 py-2 text-sm rounded-xl border border-[--border] hover:bg-[--muted] transition-colors"
          >
            📋 Vorlagen
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowTemplates(false); setEditingId(null); }}
            className="px-4 py-2 text-sm rounded-xl bg-[--primary] text-white hover:opacity-90 transition-opacity"
          >
            + Indikator
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[--card] border border-[--border] rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-[--primary]">{score}%</div>
            <div className="text-xs text-[--muted-foreground] mt-1">Qualitäts-Score</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-green-700">{gut}</div>
            <div className="text-xs text-green-600 mt-1">Gut</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-yellow-700">{verbessern}</div>
            <div className="text-xs text-yellow-600 mt-1">Verbesserungsbedarf</div>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-red-700">{kritisch}</div>
            <div className="text-xs text-red-600 mt-1">Kritisch</div>
          </div>
        </div>
      )}

      {/* Templates panel */}
      {showTemplates && (
        <div className="bg-[--card] border border-[--border] rounded-2xl p-4 space-y-3">
          <h3 className="font-semibold text-sm">QS-Vorlagen (MDK-konforme Indikatoren)</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEFAULT_INDIKATOREN.map((tpl, i) => (
              <button
                key={i}
                onClick={() => applyTemplate(tpl)}
                className="text-left px-3 py-2 rounded-xl border border-[--border] hover:bg-[--muted] text-sm transition-colors"
              >
                <span className="font-medium">{tpl.indikator}</span>
                <span className="text-[--muted-foreground] ml-2">({tpl.kategorie}) Ziel: {tpl.zielwert}{tpl.einheit}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div className="bg-[--card] border border-[--border] rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold">{editingId ? "Indikator bearbeiten" : "Neuer Indikator"}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Indikator-Bezeichnung *</label>
              <input
                type="text"
                placeholder="z.B. Dekubitusrate (Grad 2+)"
                value={form.indikator}
                onChange={e => setForm(f => ({ ...f, indikator: e.target.value }))}
                className="w-full border border-[--border] rounded-xl px-4 py-2.5 text-sm bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Kategorie</label>
              <select
                value={form.kategorie}
                onChange={e => setForm(f => ({ ...f, kategorie: e.target.value }))}
                className="w-full border border-[--border] rounded-xl px-4 py-2.5 text-sm bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
              >
                {KATEGORIEN.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Wert *</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.wert}
                  onChange={e => setForm(f => ({ ...f, wert: e.target.value }))}
                  className="w-full border border-[--border] rounded-xl px-4 py-2.5 text-sm bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Einheit</label>
                <input
                  type="text"
                  placeholder="%"
                  value={form.einheit}
                  onChange={e => setForm(f => ({ ...f, einheit: e.target.value }))}
                  className="w-full border border-[--border] rounded-xl px-4 py-2.5 text-sm bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Zielwert</label>
              <input
                type="number"
                placeholder="z.B. 95"
                value={form.zielwert}
                onChange={e => setForm(f => ({ ...f, zielwert: e.target.value }))}
                className="w-full border border-[--border] rounded-xl px-4 py-2.5 text-sm bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Bewertung</label>
              <select
                value={form.bewertung}
                onChange={e => setForm(f => ({ ...f, bewertung: e.target.value as Indikator["bewertung"] }))}
                className="w-full border border-[--border] rounded-xl px-4 py-2.5 text-sm bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
              >
                {Object.entries(BEWERTUNG_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Trend</label>
              <select
                value={form.trend}
                onChange={e => setForm(f => ({ ...f, trend: e.target.value as Indikator["trend"] }))}
                className="w-full border border-[--border] rounded-xl px-4 py-2.5 text-sm bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
              >
                <option value="steigend">↑ Steigend</option>
                <option value="stabil">→ Stabil</option>
                <option value="fallend">↓ Fallend</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Quelle</label>
              <input
                type="text"
                placeholder="z.B. MDK-Prüfbericht Q1/2024"
                value={form.quelle}
                onChange={e => setForm(f => ({ ...f, quelle: e.target.value }))}
                className="w-full border border-[--border] rounded-xl px-4 py-2.5 text-sm bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]/40"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Notiz</label>
              <textarea
                rows={2}
                placeholder="Interne Anmerkungen..."
                value={form.notiz}
                onChange={e => setForm(f => ({ ...f, notiz: e.target.value }))}
                className="w-full border border-[--border] rounded-xl px-4 py-2.5 text-sm bg-[--background] focus:outline-none focus:ring-2 focus:ring-[--primary]/40 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="px-4 py-2 text-sm border border-[--border] rounded-xl hover:bg-[--muted]">
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={!form.indikator.trim() || form.wert === ""}
              className="px-4 py-2 text-sm rounded-xl bg-[--primary] text-white hover:opacity-90 disabled:opacity-50"
            >
              Speichern
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {total === 0 && !showForm && !showTemplates && (
        <div className="bg-[--muted] border border-[--border] rounded-2xl p-10 text-center">
          <p className="text-[--muted-foreground] text-sm mb-3">
            Noch keine Qualitätsindikatoren für {activePeriode} erfasst.
          </p>
          <button
            onClick={() => setShowTemplates(true)}
            className="px-4 py-2 text-sm rounded-xl bg-[--primary] text-white hover:opacity-90"
          >
            Mit MDK-Vorlagen starten
          </button>
        </div>
      )}

      {/* Indicators grouped by category */}
      {displayKategorien.map(kat => {
        const items = grouped[kat.value] ?? [];
        if (!items.length) return null;
        return (
          <div key={kat.value} className="space-y-3">
            <h2 className="text-base font-semibold text-[--foreground] border-b border-[--border] pb-2">
              {kat.label}
              <span className="ml-2 text-sm font-normal text-[--muted-foreground]">({items.length})</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map(ind => {
                const cfg = BEWERTUNG_CONFIG[ind.bewertung] ?? BEWERTUNG_CONFIG.neutral;
                return (
                  <div key={ind.id} className="bg-[--card] border border-[--border] rounded-2xl p-4 space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-[--foreground] leading-snug flex-1">{ind.indikator}</p>
                      <button
                        onClick={() => handleDelete(ind.id)}
                        className="text-[--muted-foreground] hover:text-red-500 text-xs shrink-0"
                        title="Löschen"
                      >✕</button>
                    </div>

                    {/* Value + trend */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[--foreground]">{ind.wert}</span>
                      <span className="text-sm text-[--muted-foreground]">{ind.einheit}</span>
                      <span className={`text-lg font-bold ml-auto ${TREND_COLOR[ind.trend]}`}>
                        {TREND_ICON[ind.trend]}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <ProgressBar wert={ind.wert} zielwert={ind.zielwert} bewertung={ind.bewertung} />

                    {/* Bewertung badge */}
                    <div className="flex gap-2 items-center flex-wrap">
                      <select
                        value={ind.bewertung}
                        onChange={e => handleQuickEdit(ind.id, { bewertung: e.target.value as Indikator["bewertung"] })}
                        className={`text-xs px-2 py-1 rounded-lg border-0 font-medium cursor-pointer ${cfg.bg} ${cfg.color} focus:outline-none focus:ring-2 focus:ring-[--primary]/40`}
                      >
                        {Object.entries(BEWERTUNG_CONFIG).map(([v, c]) => (
                          <option key={v} value={v}>{c.label}</option>
                        ))}
                      </select>
                      <select
                        value={ind.trend}
                        onChange={e => handleQuickEdit(ind.id, { trend: e.target.value as Indikator["trend"] })}
                        className={`text-xs px-2 py-1 rounded-lg border border-[--border] bg-[--card] cursor-pointer focus:outline-none ${TREND_COLOR[ind.trend]}`}
                      >
                        <option value="steigend">↑ Steigend</option>
                        <option value="stabil">→ Stabil</option>
                        <option value="fallend">↓ Fallend</option>
                      </select>
                    </div>

                    {/* Notiz / Quelle */}
                    {(ind.notiz || ind.quelle) && (
                      <div className="text-xs text-[--muted-foreground] space-y-0.5 pt-1 border-t border-[--border]">
                        {ind.quelle && <p>📎 {ind.quelle}</p>}
                        {ind.notiz && <p className="italic">{ind.notiz}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

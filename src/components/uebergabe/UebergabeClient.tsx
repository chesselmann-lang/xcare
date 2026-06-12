"use client";

import { useState } from "react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import {
  Plus, CheckCircle, Clock, AlertCircle, Printer, ChevronDown,
  ChevronUp, ArrowRight, Stethoscope, Info, Activity, ClipboardList,
  Lightbulb, Trash2, UserCheck,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  familie_profile_id?: string | null;
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

// ─── Config ──────────────────────────────────────────────────────────────────

const STIMMUNG_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  gut:      { label: "Gut",      color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  mittel:   { label: "Mittel",   color: "bg-amber-100 text-amber-700",     dot: "bg-amber-400"  },
  schlecht: { label: "Schlecht", color: "bg-red-100 text-red-700",         dot: "bg-red-500"    },
  unruhig:  { label: "Unruhig",  color: "bg-orange-100 text-orange-700",   dot: "bg-orange-400" },
};

const SBAR_SECTIONS = [
  {
    key: "situation" as const,
    icon: Stethoscope,
    letter: "S",
    label: "Situation",
    desc: "Allgemeinzustand & Stimmung",
    color: "blue",
  },
  {
    key: "background" as const,
    icon: Info,
    letter: "B",
    label: "Background",
    desc: "Besonderheiten & Hintergrund",
    color: "purple",
  },
  {
    key: "assessment" as const,
    icon: Activity,
    letter: "A",
    label: "Assessment",
    desc: "Medikamentenstatus & Vitalwerte",
    color: "amber",
  },
  {
    key: "recommendation" as const,
    icon: Lightbulb,
    letter: "R",
    label: "Recommendation",
    desc: "Offene Aufgaben für Folgeschicht",
    color: "green",
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; light: string }> = {
  blue:   { bg: "bg-blue-600",    border: "border-blue-200",    text: "text-blue-700",    light: "bg-blue-50"    },
  purple: { bg: "bg-purple-600",  border: "border-purple-200",  text: "text-purple-700",  light: "bg-purple-50"  },
  amber:  { bg: "bg-amber-500",   border: "border-amber-200",   text: "text-amber-700",   light: "bg-amber-50"   },
  green:  { bg: "bg-emerald-600", border: "border-emerald-200", text: "text-emerald-700", light: "bg-emerald-50" },
};

// ─── Print helper ─────────────────────────────────────────────────────────────

function handlePrint(p: Protokoll) {
  const von = p.care_workers_von
    ? `${p.care_workers_von.vorname} ${p.care_workers_von.nachname}`
    : "—";
  const bis = p.care_workers_bis
    ? `${p.care_workers_bis.vorname} ${p.care_workers_bis.nachname}`
    : "—";
  const ts = format(parseISO(p.erstellt_am), "dd.MM.yyyy HH:mm 'Uhr'", { locale: de });

  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
  <title>Übergabeprotokoll ${ts}</title>
  <style>
    body{font-family:Arial,sans-serif;margin:40px;color:#111;font-size:13px}
    h1{font-size:18px;margin-bottom:4px}
    .meta{color:#555;font-size:12px;margin-bottom:20px}
    .section{margin-bottom:16px;border:1px solid #ddd;border-radius:6px;overflow:hidden}
    .section-hd{background:#f5f5f5;padding:8px 12px;font-weight:bold;font-size:12px;text-transform:uppercase;letter-spacing:.05em}
    .section-bd{padding:10px 12px;white-space:pre-wrap}
    .badges{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
    .badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
    .green{background:#d1fae5;color:#065f46}.red{background:#fee2e2;color:#991b1b}
    .gray{background:#f3f4f6;color:#374151}.amber{background:#fef3c7;color:#92400e}
    footer{margin-top:30px;font-size:11px;color:#888;border-top:1px solid #eee;padding-top:10px}
    @media print{body{margin:20px}}
  </style></head><body>
  <h1>Übergabeprotokoll</h1>
  <div class="meta">Erstellt: ${ts} &nbsp;|&nbsp; Abtretend: ${von} &nbsp;→&nbsp; Übernehmend: ${bis}</div>
  <div class="badges">
    ${p.stimmung ? `<span class="badge amber">Stimmung: ${STIMMUNG_CONFIG[p.stimmung]?.label ?? p.stimmung}</span>` : ""}
    ${p.vitalwerte_auffaellig ? `<span class="badge red">⚠ Vitalwerte auffällig</span>` : ""}
    ${p.bestaetigt ? `<span class="badge green">✓ Bestätigt ${p.bestaetigt_am ? format(parseISO(p.bestaetigt_am), "dd.MM.yyyy HH:mm", { locale: de }) : ""}</span>` : `<span class="badge gray">Ausstehend</span>`}
  </div>
  ${p.allgemeinzustand ? `<div class="section"><div class="section-hd">S – Situation / Allgemeinzustand</div><div class="section-bd">${p.allgemeinzustand}</div></div>` : ""}
  ${p.besonderheiten ? `<div class="section"><div class="section-hd">B – Background / Besonderheiten</div><div class="section-bd">${p.besonderheiten}</div></div>` : ""}
  ${p.medikamente_status ? `<div class="section"><div class="section-hd">A – Assessment / Medikamentenstatus</div><div class="section-bd">${p.medikamente_status}</div></div>` : ""}
  ${p.offene_aufgaben ? `<div class="section"><div class="section-hd">R – Recommendation / Offene Aufgaben</div><div class="section-bd">${p.offene_aufgaben}</div></div>` : ""}
  <footer>xcare · Digitales Übergabeprotokoll · ${ts}</footer>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.print();
}

// ─── Main Component ───────────────────────────────────────────────────────────

const emptyForm = {
  familie_profile_id: "",
  care_worker_von: "",
  care_worker_bis: "",
  allgemeinzustand: "",
  besonderheiten: "",
  offene_aufgaben: "",
  medikamente_status: "",
  vitalwerte_auffaellig: false,
  stimmung: "" as "" | "gut" | "mittel" | "schlecht" | "unruhig",
};

export default function UebergabeClient({
  protokolle: initial,
  careWorkers = [],
  isAnbieter,
  familieProfileId,
  familieOptionen = [],
}: Props) {
  const [protokolle, setProtokolle] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [selectedFamilie, setSelectedFamilie] = useState(familieProfileId ?? "");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm, familie_profile_id: familieProfileId ?? "" });

  const displayed = selectedFamilie
    ? protokolle.filter((p) => !p.familie_profile_id || p.familie_profile_id === selectedFamilie)
    : protokolle;

  // ─── Handlers ─────────────────────────────────────────────────────────────

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
      setForm({ ...emptyForm, familie_profile_id: familieProfileId ?? "" });
      setMsg({ text: "Übergabeprotokoll erfolgreich erstellt.", ok: true });
    } catch {
      setMsg({ text: "Fehler beim Speichern. Bitte erneut versuchen.", ok: false });
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm(id: string) {
    setConfirmingId(id);
    try {
      const res = await fetch(`/api/uebergabe/${id}`, { method: "PATCH" });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setProtokolle((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, bestaetigt: updated.bestaetigt, bestaetigt_am: updated.bestaetigt_am }
            : p
        )
      );
      setMsg({ text: "Übergabe bestätigt.", ok: true });
    } catch {
      setMsg({ text: "Fehler bei der Bestätigung.", ok: false });
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Protokoll wirklich löschen?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/uebergabe/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setMsg({ text: (j as { error?: string }).error ?? "Löschen nicht möglich.", ok: false });
        return;
      }
      setProtokolle((prev) => prev.filter((p) => p.id !== id));
      setMsg({ text: "Protokoll gelöscht.", ok: true });
    } catch {
      setMsg({ text: "Fehler beim Löschen.", ok: false });
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header row ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {isAnbieter && familieOptionen.length > 0 && (
            <select
              value={selectedFamilie}
              onChange={(e) => setSelectedFamilie(e.target.value)}
              className="border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]"
            >
              <option value="">Alle Klienten</option>
              {familieOptionen.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.vorname} {f.nachname}
                </option>
              ))}
            </select>
          )}
          <span className="text-sm text-[--muted-foreground]">
            {displayed.length} Protokoll{displayed.length !== 1 ? "e" : ""}
          </span>
        </div>
        {isAnbieter && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-[--primary] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            {showForm ? "Abbrechen" : "Neues Protokoll"}
          </button>
        )}
      </div>

      {/* ── Toast ──────────────────────────────────────────────── */}
      {msg && (
        <div
          className={`text-sm px-4 py-3 rounded-lg flex items-center gap-2 ${
            msg.ok
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-600 border border-red-200"
          }`}
        >
          {msg.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {msg.text}
        </div>
      )}


      {/* ── New Protokoll Form (SBAR) ───────────────────────────── */}
      {showForm && (
        <div className="rounded-xl border border-[--border] bg-[--card] p-6 space-y-5">
          <h3 className="font-semibold text-[--foreground] flex items-center gap-2">
            <ClipboardList size={18} className="text-[--muted-foreground]" />
            Neues Übergabeprotokoll (SBAR)
          </h3>

          {/* Familie selector (Anbieter only) */}
          {isAnbieter && familieOptionen.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Klient</label>
              <select
                value={form.familie_profile_id}
                onChange={(e) => setForm((f) => ({ ...f, familie_profile_id: e.target.value }))}
                className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]"
              >
                <option value="">Klient waehlen</option>
                {familieOptionen.map((fOpt) => (
                  <option key={fOpt.id} value={fOpt.id}>
                    {fOpt.vorname} {fOpt.nachname}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Care worker selectors */}
          {careWorkers.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Abtretend (Von)</label>
                <select
                  value={form.care_worker_von}
                  onChange={(e) => setForm((f) => ({ ...f, care_worker_von: e.target.value }))}
                  className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]"
                >
                  <option value="">Pflegekraft waehlen</option>
                  {careWorkers.map((cw) => (
                    <option key={cw.id} value={cw.id}>
                      {cw.vorname} {cw.nachname}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[--muted-foreground] mb-1">Ubernehmend (Bis)</label>
                <select
                  value={form.care_worker_bis}
                  onChange={(e) => setForm((f) => ({ ...f, care_worker_bis: e.target.value }))}
                  className="w-full border border-[--border] rounded-lg px-3 py-2 text-sm bg-[--background]"
                >
                  <option value="">Pflegekraft waehlen</option>
                  {careWorkers.map((cw) => (
                    <option key={cw.id} value={cw.id}>
                      {cw.vorname} {cw.nachname}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* SBAR Sections */}
          {SBAR_SECTIONS.map((section) => {
            const colors = COLOR_MAP[section.color];
            return (
              <div key={section.key} className={`rounded-xl border ${colors.border} ${colors.light} p-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full ${colors.bg} text-white text-sm font-bold`}>
                    {section.letter}
                  </span>
                  <div>
                    <p className={`font-semibold text-sm ${colors.text}`}>{section.label}</p>
                    <p className="text-xs text-[--muted-foreground]">{section.desc}</p>
                  </div>
                </div>

                {section.key === "situation" && (
                  <div className="space-y-3">
                    <textarea
                      rows={3}
                      value={form.allgemeinzustand}
                      onChange={(e) => setForm((f) => ({ ...f, allgemeinzustand: e.target.value }))}
                      placeholder="Allgemeinzustand beschreiben..."
                      className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary] resize-none"
                    />
                    <div>
                      <p className="text-xs font-medium text-[--muted-foreground] mb-2">Stimmung</p>
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(STIMMUNG_CONFIG).map(([key, cfg]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, stimmung: f.stimmung === key ? "" : key as typeof f.stimmung }))}
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                              form.stimmung === key
                                ? cfg.color + " border-current shadow-sm"
                                : "bg-[--background] border-[--border] text-[--muted-foreground]"
                            }`}
                          >
                            <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {section.key === "background" && (
                  <textarea
                    rows={3}
                    value={form.besonderheiten}
                    onChange={(e) => setForm((f) => ({ ...f, besonderheiten: e.target.value }))}
                    placeholder="Besonderheiten, Vorkommnisse, relevante Hintergrundinformationen..."
                    className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary] resize-none"
                  />
                )}

                {section.key === "assessment" && (
                  <div className="space-y-3">
                    <textarea
                      rows={3}
                      value={form.medikamente_status}
                      onChange={(e) => setForm((f) => ({ ...f, medikamente_status: e.target.value }))}
                      placeholder="Medikamentenstatus, verabreichte Medikamente, Auffaelligkeiten..."
                      className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary] resize-none"
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.vitalwerte_auffaellig}
                        onChange={(e) => setForm((f) => ({ ...f, vitalwerte_auffaellig: e.target.checked }))}
                        className="rounded border-[--border] text-[--primary] focus:ring-[--primary]"
                      />
                      <span className="text-sm text-[--foreground]">Vitalwerte auffaellig</span>
                    </label>
                  </div>
                )}

                {section.key === "recommendation" && (
                  <textarea
                    rows={3}
                    value={form.offene_aufgaben}
                    onChange={(e) => setForm((f) => ({ ...f, offene_aufgaben: e.target.value }))}
                    placeholder="Offene Aufgaben, Empfehlungen, Prioritaeten fuer die naechste Schicht..."
                    className="w-full rounded-lg border border-[--border] bg-[--background] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--primary] resize-none"
                  />
                )}
              </div>
            );
          })}

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[--primary] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? "Speichere..." : "Protokoll speichern"}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm({ ...emptyForm, familie_profile_id: familieProfileId ?? "" }); }}
              className="px-4 py-2 border border-[--border] rounded-lg text-sm hover:bg-[--muted] transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Protokoll-Liste */}
      {displayed.length === 0 ? (
        <div className="rounded-xl border border-[--border] bg-[--card] p-12 text-center">
          <ClipboardList size={40} className="mx-auto text-[--muted-foreground] opacity-30 mb-3" />
          <p className="text-[--muted-foreground] text-sm">Noch keine Uebergabeprotokolle vorhanden.</p>
          {isAnbieter && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm text-[--primary] hover:underline"
            >
              Erstes Protokoll erstellen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((p) => {
            const isNew = Date.now() - new Date(p.erstellt_am).getTime() < 2 * 60 * 60 * 1000;
            const isExpanded = expandedId === p.id;
            const workerVon = p.care_workers_von
              ? `${p.care_workers_von.vorname} ${p.care_workers_von.nachname}`
              : null;
            const workerBis = p.care_workers_bis
              ? `${p.care_workers_bis.vorname} ${p.care_workers_bis.nachname}`
              : null;

            return (
              <div
                key={p.id}
                className={`rounded-xl border bg-[--card] overflow-hidden ${
                  p.bestaetigt ? "border-emerald-200" : "border-[--border]"
                }`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[--muted]/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="shrink-0">
                      {p.bestaetigt ? (
                        <CheckCircle size={18} className="text-emerald-500" />
                      ) : (
                        <Clock size={18} className="text-amber-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[--foreground]">
                          {format(parseISO(p.erstellt_am), "dd.MM.yyyy HH:mm 'Uhr'", { locale: de })}
                        </span>
                        {isNew && (
                          <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-semibold">NEU</span>
                        )}
                        {p.bestaetigt && (
                          <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-semibold">Bestaetigt</span>
                        )}
                        {p.vitalwerte_auffaellig && (
                          <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-semibold">Vital</span>
                        )}
                        {p.stimmung && STIMMUNG_CONFIG[p.stimmung] && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STIMMUNG_CONFIG[p.stimmung].color}`}>
                            {STIMMUNG_CONFIG[p.stimmung].label}
                          </span>
                        )}
                      </div>
                      {(workerVon || workerBis) && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-[--muted-foreground]">
                          {workerVon && <span>{workerVon}</span>}
                          {workerVon && workerBis && <ArrowRight size={12} className="shrink-0" />}
                          {workerBis && <span>{workerBis}</span>}
                        </div>
                      )}
                      <p className="text-xs text-[--muted-foreground] mt-0.5">
                        {formatDistanceToNow(parseISO(p.erstellt_am), { addSuffix: true, locale: de })}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-[--muted-foreground] shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-[--muted-foreground] shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-[--border] p-4 space-y-3">
                    {SBAR_SECTIONS.map((section) => {
                      const colors = COLOR_MAP[section.color];
                      const value =
                        section.key === "situation" ? p.allgemeinzustand
                        : section.key === "background" ? p.besonderheiten
                        : section.key === "assessment" ? p.medikamente_status
                        : p.offene_aufgaben;

                      if (!value && section.key !== "assessment") return null;

                      return (
                        <div key={section.key} className={`rounded-lg border ${colors.border} ${colors.light} p-3`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full ${colors.bg} text-white text-xs font-bold`}>
                              {section.letter}
                            </span>
                            <span className={`text-xs font-semibold ${colors.text}`}>{section.label}</span>
                            {section.key === "assessment" && p.vitalwerte_auffaellig && (
                              <span className="ml-auto text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                                Vitalwerte auffaellig
                              </span>
                            )}
                          </div>
                          {value && <p className="text-sm text-[--foreground] whitespace-pre-wrap">{value}</p>}
                        </div>
                      );
                    })}

                    {p.bestaetigt && p.bestaetigt_am && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <UserCheck size={12} />
                        Bestaetigt am {format(parseISO(p.bestaetigt_am), "dd.MM.yyyy HH:mm 'Uhr'", { locale: de })}
                      </p>
                    )}

                    <div className="flex gap-2 pt-1 flex-wrap">
                      {!p.bestaetigt && (
                        <button
                          onClick={() => handleConfirm(p.id)}
                          disabled={confirmingId === p.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          <UserCheck size={13} />
                          {confirmingId === p.id ? "Bestaetigt..." : "Uebergabe bestaetigen"}
                        </button>
                      )}
                      <button
                        onClick={() => handlePrint(p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[--border] rounded-lg hover:bg-[--muted] transition-colors"
                      >
                        <Printer size={13} />
                        Drucken
                      </button>
                      {isAnbieter && (
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors ml-auto"
                        >
                          <Trash2 size={13} />
                          {deletingId === p.id ? "Loesche..." : "Loeschen"}
                        </button>
                      )}
                    </div>
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

"use client";

import { useState, useCallback } from "react";
import {
  Euro, Download, CheckCircle, Clock, FileText, ChevronLeft, ChevronRight,
  Users, TrendingUp, AlertCircle, RefreshCw
} from "lucide-react";

type LohnPeriode = {
  id: string | null;
  care_worker_id: string;
  care_worker: { vorname: string; nachname: string; stundensatz_ct?: number; rolle?: string };
  periode_start: string;
  periode_ende: string;
  schichten_anzahl: number;
  stunden_geplant: number;
  stunden_tatsaechlich: number;
  zuschlaege_ct: number;
  brutto_ct: number;
  status: "offen" | "geprueft" | "freigegeben" | "exportiert";
  notizen?: string | null;
  freigegeben_am?: string | null;
  exportiert_am?: string | null;
};

type Summe = { schichten: number; stundenGeplant: number; bruttoCt: number };

type Props = {
  initialPerioden: LohnPeriode[];
  initialMonat: string;
  initialSumme: Summe;
};

const STATUS_COLORS: Record<string, string> = {
  offen: "bg-gray-100 text-gray-700",
  geprueft: "bg-blue-100 text-blue-700",
  freigegeben: "bg-green-100 text-green-700",
  exportiert: "bg-purple-100 text-purple-700",
};

const STATUS_LABELS: Record<string, string> = {
  offen: "Offen",
  geprueft: "Geprüft",
  freigegeben: "Freigegeben",
  exportiert: "Exportiert",
};

function formatEuro(ct: number) {
  return (ct / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function prevMonat(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nextMonat(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monatLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

export function LohnabrechnungClient({ initialPerioden, initialMonat, initialSumme }: Props) {
  const [monat, setMonat] = useState(initialMonat);
  const [perioden, setPerioden] = useState<LohnPeriode[]>(initialPerioden);
  const [summe, setSumme] = useState<Summe>(initialSumme);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"simple" | "datev" | "lodas">("simple");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadMonat = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lohnabrechnung?monat=${m}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPerioden(data.perioden ?? []);
      setSumme(data.summe ?? { schichten: 0, stundenGeplant: 0, bruttoCt: 0 });
    } catch {
      // keep current
    } finally {
      setLoading(false);
    }
  }, []);

  const changeMonat = (m: string) => {
    setMonat(m);
    setSelectedIds(new Set());
    loadMonat(m);
  };

  const updateStatus = async (periode: LohnPeriode, newStatus: LohnPeriode["status"]) => {
    const key = `${periode.care_worker_id}_${newStatus}`;
    setSaving(key);
    try {
      const res = await fetch("/api/lohnabrechnung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          care_worker_id: periode.care_worker_id,
          periode_start: periode.periode_start,
          periode_ende: periode.periode_ende,
          schichten_anzahl: periode.schichten_anzahl,
          stunden_geplant: periode.stunden_geplant,
          stunden_tatsaechlich: periode.stunden_tatsaechlich,
          zuschlaege_ct: periode.zuschlaege_ct,
          brutto_ct: periode.brutto_ct,
          notizen: periode.notizen,
          status: newStatus,
        }),
      });
      if (res.ok) {
        setPerioden(prev =>
          prev.map(p =>
            p.care_worker_id === periode.care_worker_id ? { ...p, status: newStatus, id: (await res.json()).periode?.id ?? p.id } : p
          )
        );
        // Re-fetch to get server state
        await loadMonat(monat);
      }
    } finally {
      setSaving(null);
    }
  };

  const freigebenAll = async () => {
    const offene = perioden.filter(p => p.status === "offen" || p.status === "geprueft");
    for (const p of offene) await updateStatus(p, "freigegeben");
  };

  const handleExport = () => {
    window.open(`/api/lohnabrechnung/export?monat=${monat}&format=${exportFormat}`, "_blank");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const freigegebenCount = perioden.filter(p => p.status === "freigegeben" || p.status === "exportiert").length;
  const totalCount = perioden.length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Lohnabrechnung</h1>
          <p className="text-sm text-[--muted-foreground] mt-1">
            Monatliche Gehaltsabrechnung für Pflegekräfte — DATEV/LODAS Export
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={exportFormat}
            onChange={e => setExportFormat(e.target.value as typeof exportFormat)}
            className="text-sm border border-[--border] rounded-lg px-3 py-2 bg-[--card]"
          >
            <option value="simple">Einfach (CSV)</option>
            <option value="datev">DATEV Format</option>
            <option value="lodas">LODAS Format</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Monatsnavigation */}
      <div className="flex items-center justify-between bg-[--card] border border-[--border] rounded-xl p-4">
        <button
          onClick={() => changeMonat(prevMonat(monat))}
          className="p-2 rounded-lg hover:bg-[--muted] transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <div className="text-lg font-semibold">{monatLabel(monat)}</div>
          <div className="text-xs text-[--muted-foreground] mt-0.5">
            {freigegebenCount}/{totalCount} Freigegeben
          </div>
        </div>
        <button
          onClick={() => changeMonat(nextMonat(monat))}
          className="p-2 rounded-lg hover:bg-[--muted] transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* KPI-Karten */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Mitarbeiter", value: totalCount, icon: Users, color: "text-blue-600" },
          { label: "Schichten", value: summe.schichten, icon: FileText, color: "text-purple-600" },
          { label: "Stunden gesamt", value: `${summe.stundenGeplant.toFixed(1)} h`, icon: Clock, color: "text-amber-600" },
          { label: "Brutto gesamt", value: formatEuro(summe.bruttoCt), icon: Euro, color: "text-green-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[--card] border border-[--border] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-xs text-[--muted-foreground]">{label}</span>
            </div>
            <div className="text-xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      {/* Fortschrittsbalken */}
      {totalCount > 0 && (
        <div className="bg-[--card] border border-[--border] rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[--muted-foreground]">Freigabe-Status</span>
            <span className="font-medium">{freigegebenCount}/{totalCount} freigegeben</span>
          </div>
          <div className="h-2 bg-[--muted] rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${totalCount ? (freigegebenCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          {freigegebenCount < totalCount && (
            <button
              onClick={freigebenAll}
              className="mt-3 text-sm text-[--primary] hover:underline"
            >
              Alle freigeben →
            </button>
          )}
        </div>
      )}

      {/* Tabelle */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-[--muted] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : perioden.length === 0 ? (
        <div className="bg-[--card] border border-[--border] rounded-xl p-12 text-center">
          <TrendingUp className="h-12 w-12 text-[--muted-foreground] mx-auto mb-4 opacity-30" />
          <div className="font-medium">Keine Daten</div>
          <p className="text-sm text-[--muted-foreground] mt-1">
            Für {monatLabel(monat)} sind keine Schichten erfasst.
          </p>
          <button
            onClick={() => loadMonat(monat)}
            className="mt-4 flex items-center gap-2 mx-auto text-sm text-[--primary] hover:underline"
          >
            <RefreshCw className="h-4 w-4" />
            Neu laden
          </button>
        </div>
      ) : (
        <div className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[--border] bg-[--muted]/30">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-[--muted-foreground]">Mitarbeiter</th>
                <th className="text-right px-4 py-3 font-medium text-[--muted-foreground]">Schichten</th>
                <th className="text-right px-4 py-3 font-medium text-[--muted-foreground]">Stunden</th>
                <th className="text-right px-4 py-3 font-medium text-[--muted-foreground]">Zuschläge</th>
                <th className="text-right px-4 py-3 font-medium text-[--muted-foreground]">Brutto</th>
                <th className="text-center px-4 py-3 font-medium text-[--muted-foreground]">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[--border]">
              {perioden.map(p => {
                const name = `${p.care_worker?.nachname ?? ""}, ${p.care_worker?.vorname ?? ""}`;
                const isExpanded = expandedId === p.care_worker_id;
                const grundlohn = p.brutto_ct - p.zuschlaege_ct;

                return (
                  <>
                    <tr
                      key={p.care_worker_id}
                      className="hover:bg-[--muted]/20 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : p.care_worker_id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{name}</div>
                        <div className="text-xs text-[--muted-foreground]">
                          {p.care_worker?.rolle ?? "Pflegekraft"} · {formatEuro(p.care_worker?.stundensatz_ct ?? 0)}/h
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">{p.schichten_anzahl}</td>
                      <td className="px-4 py-3 text-right">{Number(p.stunden_geplant).toFixed(1)} h</td>
                      <td className="px-4 py-3 text-right">
                        {p.zuschlaege_ct > 0 ? (
                          <span className="text-amber-600">{formatEuro(p.zuschlaege_ct)}</span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{formatEuro(p.brutto_ct)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                          {p.status === "offen" && (
                            <button
                              onClick={() => updateStatus(p, "geprueft")}
                              disabled={saving !== null}
                              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                            >
                              Prüfen
                            </button>
                          )}
                          {(p.status === "geprueft" || p.status === "offen") && (
                            <button
                              onClick={() => updateStatus(p, "freigegeben")}
                              disabled={saving !== null}
                              className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                            >
                              Freigeben
                            </button>
                          )}
                          {p.status === "freigegeben" && (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Freigegeben
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${p.care_worker_id}_detail`}>
                        <td colSpan={7} className="px-4 pb-4 bg-[--muted]/10">
                          <div className="mt-2 grid grid-cols-3 gap-4 text-xs">
                            <div className="bg-[--card] border border-[--border] rounded-lg p-3">
                              <div className="text-[--muted-foreground] mb-1">Grundlohn</div>
                              <div className="font-semibold text-base">{formatEuro(grundlohn)}</div>
                              <div className="text-[--muted-foreground]">{Number(p.stunden_geplant).toFixed(1)} h × {formatEuro(p.care_worker?.stundensatz_ct ?? 0)}</div>
                            </div>
                            <div className="bg-[--card] border border-[--border] rounded-lg p-3">
                              <div className="text-[--muted-foreground] mb-1">Zuschläge</div>
                              <div className="font-semibold text-base text-amber-600">{formatEuro(p.zuschlaege_ct)}</div>
                              <div className="text-[--muted-foreground]">Nacht + Wochenende</div>
                            </div>
                            <div className="bg-[--card] border border-[--border] rounded-lg p-3">
                              <div className="text-[--muted-foreground] mb-1">Brutto gesamt</div>
                              <div className="font-semibold text-base text-green-600">{formatEuro(p.brutto_ct)}</div>
                              <div className="text-[--muted-foreground]">
                                {p.freigegeben_am
                                  ? `Freigegeben am ${new Date(p.freigegeben_am).toLocaleDateString("de-DE")}`
                                  : p.status === "offen" ? "Noch nicht geprüft" : STATUS_LABELS[p.status]}
                              </div>
                            </div>
                          </div>
                          {p.notizen && (
                            <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
                              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                              <span>{p.notizen}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-[--border] bg-[--muted]/20">
              <tr>
                <td className="px-4 py-3 font-semibold">Gesamt</td>
                <td className="px-4 py-3 text-right font-medium">{summe.schichten}</td>
                <td className="px-4 py-3 text-right font-medium">{summe.stundenGeplant.toFixed(1)} h</td>
                <td className="px-4 py-3 text-right font-medium text-amber-600">
                  {formatEuro(perioden.reduce((a, p) => a + p.zuschlaege_ct, 0))}
                </td>
                <td className="px-4 py-3 text-right font-bold text-green-600">{formatEuro(summe.bruttoCt)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Hinweis */}
      <div className="flex items-start gap-3 text-xs text-[--muted-foreground] bg-[--muted]/20 rounded-xl p-4">
        <FileText className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          Bruttolohn-Berechnung: Grundlohn (Stunden × Stundensatz) + Nachtzuschlag 25% (22–06 Uhr) + Wochenendzuschlag 20% (Sa/So).
          DATEV-Export ist als Vorlage konzipiert — bitte mit Ihrem Steuerbüro abstimmen.
        </div>
      </div>
    </div>
  );
}

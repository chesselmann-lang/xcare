"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Brain, Calendar, ChevronLeft, ChevronRight, Check, Loader2, Download, Wand2 } from "lucide-react";

interface TeamMember {
  profile_id: string;
  name: string;
  qualifikation?: string;
  wochenstunden?: number;
}

interface Vorschlag {
  id: string;
  woche_start: string;
  status: "entwurf" | "aktiv" | "archiviert";
  optimierungsziel: string;
  ki_begruendung: string | null;
  created_at: string;
}

interface Eintrag {
  id?: string;
  mitarbeiter_profile_id: string;
  datum: string;
  schicht_beginn: string;
  schicht_ende: string;
  schichttyp: "frueh" | "spaet" | "nacht" | "bereitschaft" | "frei";
  notiz?: string | null;
  ki_vorschlag?: boolean;
  bestaetigt?: boolean;
}

interface Props {
  team: TeamMember[];
  vorschlaege: Vorschlag[];
  currentWoche: string;
}

const SCHICHTTYPEN = [
  { value: "frueh", label: "Früh", color: "bg-amber-100 text-amber-800", time: "06:00–14:00" },
  { value: "spaet", label: "Spät", color: "bg-blue-100 text-blue-800", time: "14:00–22:00" },
  { value: "nacht", label: "Nacht", color: "bg-indigo-100 text-indigo-800", time: "22:00–06:00" },
  { value: "bereitschaft", label: "Bereit.", color: "bg-purple-100 text-purple-800", time: "Bereitschaft" },
  { value: "frei", label: "Frei", color: "bg-gray-100 text-gray-600", time: "–" },
] as const;

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const ZIELE = [
  { value: "ausgewogen", label: "Ausgewogen", desc: "Faire Verteilung für alle" },
  { value: "kostenminimal", label: "Kostenminimal", desc: "Weniger Überstunden & Wochenende" },
  { value: "qualitaetsmaximum", label: "Qualität max.", desc: "Beste Qualifikation je Schicht" },
  { value: "ruhezeiten", label: "Ruhezeiten", desc: "Strikte Einhaltung §5 ArbZG" },
] as const;

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function getSchichtInfo(typ: string) {
  return SCHICHTTYPEN.find((s) => s.value === typ) ?? SCHICHTTYPEN[4];
}

export function DienstplanOptimizer({ team, vorschlaege: initialVorschlaege, currentWoche }: Props) {
  const [woche, setWoche] = useState(currentWoche);
  const [ziel, setZiel] = useState<string>("ausgewogen");
  const [eintraege, setEintraege] = useState<Eintrag[]>([]);
  const [kiBegruendung, setKiBegruendung] = useState<string | null>(null);
  const [warnungen, setWarnungen] = useState<string[]>([]);
  const [vorschlaege, setVorschlaege] = useState(initialVorschlaege);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"plan" | "history">("plan");

  // Woche vor/zurück
  const shiftWoche = (delta: number) => setWoche((w) => addDays(w, delta * 7));

  // Wochentage dieser Woche
  const wochentage = WOCHENTAGE.map((_, i) => addDays(woche, i));

  // KI-Optimierung anfragen
  const handleOptimieren = useCallback(async () => {
    if (team.length === 0) {
      toast.error("Keine Teammitglieder gefunden. Bitte zuerst Team anlegen.");
      return;
    }
    setLoading(true);
    try {
      // Build offene Schichten: 3 Schichten pro Tag (Mo–Fr)
      const offene_schichten = wochentage.slice(0, 5).flatMap((datum) => [
        { datum, schichttyp: "frueh" as const },
        { datum, schichttyp: "spaet" as const },
      ]);

      const res = await fetch("/api/dienstplan/optimieren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          woche_start: woche,
          optimierungsziel: ziel,
          team: team.map((t) => ({
            profile_id: t.profile_id,
            name: t.name,
            qualifikation: t.qualifikation,
            wochenstunden: t.wochenstunden,
          })),
          offene_schichten,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setEintraege(data.eintraege ?? []);
      setKiBegruendung(data.ki_begruendung ?? null);
      setWarnungen(data.warnungen ?? []);
      toast.success("KI-Dienstplan erstellt");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }, [woche, ziel, team, wochentage]);

  // Dienstplan speichern
  const handleSpeichern = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/dienstplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          woche_start: woche,
          optimierungsziel: ziel,
          eintraege,
          ki_begruendung: kiBegruendung,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setVorschlaege((prev) => {
        const filtered = prev.filter((v) => v.woche_start !== woche);
        return [data, ...filtered].sort((a, b) => b.woche_start.localeCompare(a.woche_start));
      });
      toast.success("Dienstplan gespeichert");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  }, [woche, ziel, eintraege, kiBegruendung]);

  // Eintrag manuell hinzufügen
  const addEintrag = (mitarbeiter_profile_id: string, datum: string, schichttyp: Eintrag["schichttyp"]) => {
    const info = getSchichtInfo(schichttyp);
    const [beginn, ende] = info.time.split("–");
    setEintraege((prev) => {
      // Remove if same member+date+type exists
      const filtered = prev.filter(
        (e) => !(e.mitarbeiter_profile_id === mitarbeiter_profile_id && e.datum === datum)
      );
      if (schichttyp === "frei") return filtered;
      return [...filtered, { mitarbeiter_profile_id, datum, schicht_beginn: beginn ?? "06:00", schicht_ende: ende ?? "14:00", schichttyp, ki_vorschlag: false }];
    });
  };

  // CSV Export
  const handleExport = () => {
    const header = "Mitarbeiter,Datum,Beginn,Ende,Schichttyp\n";
    const rows = eintraege.map((e) => {
      const m = team.find((t) => t.profile_id === e.mitarbeiter_profile_id);
      return `"${m?.name ?? e.mitarbeiter_profile_id}",${e.datum},${e.schicht_beginn},${e.schicht_ende},${e.schichttyp}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dienstplan_${woche}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get Eintrag for member+day
  const getEintrag = (profileId: string, datum: string) =>
    eintraege.find((e) => e.mitarbeiter_profile_id === profileId && e.datum === datum);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-[--muted] rounded-xl p-1 w-fit">
        {(["plan", "history"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === v ? "bg-[--card] text-[--foreground] shadow-sm" : "text-[--muted-foreground] hover:text-[--foreground]"
            }`}
          >
            {v === "plan" ? "Wochenplan" : "Verlauf"}
          </button>
        ))}
      </div>

      {view === "plan" && (
        <>
          {/* Controls */}
          <div className="bg-[--card] border border-[--border] rounded-2xl p-5 space-y-4">
            {/* Wochennavigation */}
            <div className="flex items-center gap-3">
              <button onClick={() => shiftWoche(-1)} className="p-1.5 rounded-lg hover:bg-[--muted]">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[--muted-foreground]" />
                <span className="font-semibold text-[--foreground]">
                  KW {woche} — {formatDate(woche)} bis {formatDate(addDays(woche, 6))}
                </span>
              </div>
              <button onClick={() => shiftWoche(1)} className="p-1.5 rounded-lg hover:bg-[--muted]">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Optimierungsziel */}
            <div>
              <p className="text-xs font-medium text-[--muted-foreground] mb-2 uppercase tracking-wide">Optimierungsziel</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {ZIELE.map((z) => (
                  <button
                    key={z.value}
                    onClick={() => setZiel(z.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      ziel === z.value
                        ? "border-[--primary] bg-[--primary]/5 text-[--primary]"
                        : "border-[--border] hover:border-[--primary]/40 text-[--muted-foreground]"
                    }`}
                  >
                    <p className="text-sm font-medium">{z.label}</p>
                    <p className="text-xs mt-0.5 opacity-70">{z.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleOptimieren}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-[--primary] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                KI-Optimierung starten
              </button>
              {eintraege.length > 0 && (
                <>
                  <button
                    onClick={handleSpeichern}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Speichern
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2.5 border border-[--border] rounded-xl text-sm text-[--muted-foreground] hover:bg-[--muted]"
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </button>
                </>
              )}
            </div>
          </div>

          {/* KI-Begründung */}
          {kiBegruendung && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex gap-3">
              <Brain className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">KI-Begründung</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">{kiBegruendung}</p>
                {warnungen.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {warnungen.map((w, i) => (
                      <li key={i} className="text-xs text-amber-700 dark:text-amber-400">⚠ {w}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Wochenplan-Grid */}
          {team.length === 0 ? (
            <div className="bg-[--muted] border border-[--border] rounded-2xl p-12 text-center">
              <p className="text-sm text-[--muted-foreground]">Noch keine Teammitglieder angelegt. Bitte zuerst unter <strong>Team</strong> Mitarbeiter hinzufügen.</p>
            </div>
          ) : (
            <div className="bg-[--card] border border-[--border] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[--border]">
                      <th className="text-left px-4 py-3 font-medium text-[--muted-foreground] min-w-[140px]">Mitarbeiter</th>
                      {wochentage.map((datum, i) => (
                        <th key={datum} className="text-center px-2 py-3 font-medium min-w-[90px]">
                          <span className="text-[--muted-foreground]">{WOCHENTAGE[i]}</span>
                          <br />
                          <span className="text-xs text-[--muted-foreground]/70">{formatDate(datum)}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {team.map((member, mi) => (
                      <tr key={member.profile_id} className={mi % 2 === 0 ? "bg-[--muted]/30" : ""}>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-[--foreground] truncate max-w-[130px]">{member.name}</p>
                          {member.qualifikation && (
                            <p className="text-xs text-[--muted-foreground]">{member.qualifikation}</p>
                          )}
                        </td>
                        {wochentage.map((datum) => {
                          const eintrag = getEintrag(member.profile_id, datum);
                          const info = eintrag ? getSchichtInfo(eintrag.schichttyp) : null;
                          return (
                            <td key={datum} className="px-1 py-2 text-center">
                              {eintrag && info ? (
                                <div className={`rounded-lg px-2 py-1.5 text-xs font-medium ${info.color} ${eintrag.ki_vorschlag ? "ring-1 ring-offset-1 ring-blue-400" : ""}`}>
                                  <div>{info.label}</div>
                                  <div className="opacity-70 mt-0.5">{eintrag.schicht_beginn}–{eintrag.schicht_ende}</div>
                                </div>
                              ) : (
                                <select
                                  defaultValue=""
                                  onChange={(e) => {
                                    if (e.target.value) addEintrag(member.profile_id, datum, e.target.value as Eintrag["schichttyp"]);
                                  }}
                                  className="text-xs border border-[--border] rounded-lg px-1 py-1 bg-[--card] text-[--muted-foreground] w-full"
                                >
                                  <option value="">—</option>
                                  {SCHICHTTYPEN.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                  ))}
                                </select>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legende */}
              <div className="px-4 py-3 border-t border-[--border] flex items-center gap-4 flex-wrap">
                {SCHICHTTYPEN.slice(0, 4).map((s) => (
                  <div key={s.value} className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>{s.label}</span>
                    <span className="text-xs text-[--muted-foreground]">{s.time}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-xs font-medium border border-blue-400 text-blue-600">KI</span>
                  <span className="text-xs text-[--muted-foreground]">KI-Vorschlag</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {view === "history" && (
        <div className="bg-[--card] border border-[--border] rounded-2xl divide-y divide-[--border]">
          {vorschlaege.length === 0 ? (
            <div className="p-12 text-center text-sm text-[--muted-foreground]">
              Noch keine gespeicherten Dienstpläne.
            </div>
          ) : (
            vorschlaege.map((v) => (
              <div key={v.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[--muted]/30">
                <Calendar className="h-5 w-5 text-[--muted-foreground] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[--foreground]">
                    Woche ab {formatDate(v.woche_start)}
                  </p>
                  {v.ki_begruendung && (
                    <p className="text-xs text-[--muted-foreground] truncate mt-0.5">{v.ki_begruendung}</p>
                  )}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  v.status === "aktiv" ? "bg-green-100 text-green-700" :
                  v.status === "archiviert" ? "bg-gray-100 text-gray-600" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {v.status}
                </span>
                <button
                  onClick={() => {
                    setWoche(v.woche_start);
                    setView("plan");
                  }}
                  className="text-sm text-[--primary] hover:underline"
                >
                  Anzeigen
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

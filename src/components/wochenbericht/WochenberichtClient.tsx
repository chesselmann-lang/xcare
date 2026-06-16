"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Save, Send, Activity,
  Pill, Moon, Smile, Zap, FileText, CheckCircle, Clock
} from "lucide-react";

type Summary = {
  vitalwerte: { anzahl_messungen?: number; avg_systolisch?: number; avg_puls?: number; avg_temp?: string };
  medikamente: { gesamt?: number; gegeben?: number; compliance_pct?: number };
  schlaf: { avg_dauer_h?: string; eintraege?: number };
  wohlbefinden: { avg_gesamtwert?: number; eintraege?: number };
  aktivitaeten: string[];
  tagesupdates: { datum: string; allgemeinzustand?: string; aktivitaeten?: string[]; notizen?: string }[];
};

type Bericht = {
  id: string; allgemeinzustand?: string; highlights?: string; besonderheiten?: string;
  hinweise_angehoerige?: string; termine_naechste_woche?: string[];
  status: string; erstellt_am: string;
};

type BerichtListe = { id: string; woche_von: string; woche_bis: string; status: string; allgemeinzustand?: string; highlights?: string }[];

type Props = {
  bewohnerId: string;
  bewohnerName: string;
  von: string;
  bis: string;
  zusammenfassung: Summary;
  bestehendesBericht: Bericht | null;
  frühereBerichteListe: BerichtListe;
};

const ZUSTAND_COLORS: Record<string, string> = {
  sehr_gut: "text-green-600 bg-green-50", gut: "text-blue-600 bg-blue-50",
  mittel: "text-amber-600 bg-amber-50", schlecht: "text-red-600 bg-red-50",
};
const ZUSTAND_LABELS: Record<string, string> = {
  sehr_gut: "Sehr gut", gut: "Gut", mittel: "Mittel", schlecht: "Schlecht",
};

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function DataCard({ icon: Icon, label, value, sub, color = "text-[--primary]" }: {
  icon: React.ElementType; label: string; value: string | number | null; sub?: string; color?: string;
}) {
  return (
    <div className="bg-[--card] border border-[--border] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs text-[--muted-foreground]">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value ?? "–"}</div>
      {sub && <div className="text-xs text-[--muted-foreground] mt-0.5">{sub}</div>}
    </div>
  );
}

export function WochenberichtClient({ bewohnerId, bewohnerName, von, bis, zusammenfassung, bestehendesBericht, frühereBerichteListe }: Props) {
  const [woche, setWoche] = useState({ von, bis });
  const [summary, setSummary] = useState(zusammenfassung);
  const [bericht, setBericht] = useState(bestehendesBericht);
  const [historisch, setHistorisch] = useState(frühereBerichteListe);
  const [tab, setTab] = useState<"aktuell" | "historie">("aktuell");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    allgemeinzustand: bestehendesBericht?.allgemeinzustand ?? "",
    highlights: bestehendesBericht?.highlights ?? "",
    besonderheiten: bestehendesBericht?.besonderheiten ?? "",
    hinweise_angehoerige: bestehendesBericht?.hinweise_angehoerige ?? "",
    termine_naechste_woche: (bestehendesBericht?.termine_naechste_woche ?? []).join("\n"),
  });

  const navigate = async (direction: "prev" | "next") => {
    const d = new Date(woche.von);
    d.setDate(d.getDate() + (direction === "next" ? 7 : -7));
    const newVon = d.toISOString().slice(0, 10);
    setLoading(true);
    try {
      const res = await fetch(`/api/bewohner/${bewohnerId}/wochenbericht?woche=${newVon}`);
      if (res.ok) {
        const data = await res.json();
        setWoche({ von: data.von, bis: data.bis });
        setSummary(data.zusammenfassung);
        setBericht(data.bestehendesBericht);
        setHistorisch(data.frühereBerichteListe);
        if (data.bestehendesBericht) {
          setForm({
            allgemeinzustand: data.bestehendesBericht.allgemeinzustand ?? "",
            highlights: data.bestehendesBericht.highlights ?? "",
            besonderheiten: data.bestehendesBericht.besonderheiten ?? "",
            hinweise_angehoerige: data.bestehendesBericht.hinweise_angehoerige ?? "",
            termine_naechste_woche: (data.bestehendesBericht.termine_naechste_woche ?? []).join("\n"),
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const save = async (status: "entwurf" | "freigegeben") => {
    setSaving(true);
    try {
      const res = await fetch(`/api/bewohner/${bewohnerId}/wochenbericht`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...woche,
          ...form,
          termine_naechste_woche: form.termine_naechste_woche.split("\n").map(s => s.trim()).filter(Boolean),
          status,
          vitalwerte_summary: summary.vitalwerte,
          medikamente_summary: summary.medikamente,
          schlaf_summary: summary.schlaf,
          wohlbefinden_summary: summary.wohlbefinden,
          aktivitaeten_summary: { aktivitaeten: summary.aktivitaeten },
        }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setBericht(d.bericht);
      toast.success(status === "freigegeben" ? "Bericht freigegeben — Angehörige können ihn einsehen" : "Entwurf gespeichert");
    } catch {
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (s: string) => new Date(s).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
  const v = summary;
  const compliance = v.medikamente.compliance_pct;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Wochenbericht</h1>
        <p className="text-sm text-[--muted-foreground] mt-1">{bewohnerName} — für Angehörige</p>
      </div>

      {/* Wochen-Navigator */}
      <div className="flex items-center gap-3 bg-[--card] border border-[--border] rounded-xl px-4 py-3">
        <button onClick={() => navigate("prev")} disabled={loading}
          className="p-1.5 rounded-lg hover:bg-[--muted] disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 text-center">
          <div className="font-semibold">KW {getISOWeek(new Date(woche.von))}</div>
          <div className="text-sm text-[--muted-foreground]">{formatDate(woche.von)} – {formatDate(woche.bis)}</div>
        </div>
        <button onClick={() => navigate("next")} disabled={loading}
          className="p-1.5 rounded-lg hover:bg-[--muted] disabled:opacity-40">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[--border]">
        {[["aktuell", "Bericht erstellen"], ["historie", `Frühere Berichte (${historisch.length})`]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as typeof tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === k ? "border-[--primary] text-[--primary]" : "border-transparent text-[--muted-foreground] hover:text-[--foreground]"
            }`}>{l}</button>
        ))}
      </div>

      {tab === "aktuell" && (
        <>
          {/* Daten-Kacheln */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <DataCard icon={Activity} label="Vitalzeichen" value={v.vitalwerte.anzahl_messungen ? `${v.vitalwerte.anzahl_messungen}×` : "–"}
              sub={v.vitalwerte.avg_puls ? `Puls Ø${v.vitalwerte.avg_puls}` : undefined} color="text-red-500" />
            <DataCard icon={Pill} label="Med. Compliance"
              value={compliance !== null && compliance !== undefined ? `${compliance}%` : "–"}
              sub={v.medikamente.gesamt ? `${v.medikamente.gegeben}/${v.medikamente.gesamt} gegeben` : undefined}
              color={compliance && compliance >= 90 ? "text-green-500" : "text-amber-500"} />
            <DataCard icon={Moon} label="Schlaf Ø" value={v.schlaf.avg_dauer_h ? `${v.schlaf.avg_dauer_h} h` : "–"}
              sub={v.schlaf.eintraege ? `${v.schlaf.eintraege} Einträge` : undefined} color="text-indigo-500" />
            <DataCard icon={Smile} label="Wohlbefinden Ø"
              value={v.wohlbefinden.avg_gesamtwert ? `${v.wohlbefinden.avg_gesamtwert}/10` : "–"}
              sub={v.wohlbefinden.eintraege ? `${v.wohlbefinden.eintraege} Einträge` : undefined}
              color={v.wohlbefinden.avg_gesamtwert && v.wohlbefinden.avg_gesamtwert >= 7 ? "text-green-500" : "text-amber-500"} />
          </div>

          {/* Aktivitäten */}
          {v.aktivitaeten.length > 0 && (
            <div className="bg-[--card] border border-[--border] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-[--primary]" />
                <span className="font-medium text-sm">Aktivitäten diese Woche</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {v.aktivitaeten.map(a => (
                  <span key={a} className="px-2.5 py-1 bg-[--primary]/10 text-[--primary] rounded-full text-xs">{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tages-Updates */}
          {v.tagesupdates.length > 0 && (
            <div className="bg-[--card] border border-[--border] rounded-xl p-4">
              <div className="font-medium text-sm mb-3">Tages-Updates der Woche</div>
              <div className="space-y-2">
                {v.tagesupdates.map(t => (
                  <div key={t.datum} className="flex items-start gap-3 text-sm">
                    <span className="text-[--muted-foreground] shrink-0 w-20">
                      {new Date(t.datum).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}
                    </span>
                    {t.allgemeinzustand && (
                      <span className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${ZUSTAND_COLORS[t.allgemeinzustand] ?? "bg-gray-100"}`}>
                        {ZUSTAND_LABELS[t.allgemeinzustand] ?? t.allgemeinzustand}
                      </span>
                    )}
                    <span className="text-[--muted-foreground]">{t.notizen || (t.aktivitaeten?.join(", ")) || "–"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Redaktions-Formular */}
          <div className="bg-[--card] border border-[--border] rounded-xl p-5 space-y-4">
            <div className="font-semibold text-sm text-[--muted-foreground] uppercase tracking-wider mb-2">
              Bericht verfassen
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Allgemeinzustand diese Woche</label>
              <select value={form.allgemeinzustand} onChange={e => setForm(f => ({...f, allgemeinzustand: e.target.value}))}
                className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]">
                <option value="">– bitte wählen –</option>
                <option value="sehr_gut">Sehr gut</option>
                <option value="gut">Gut</option>
                <option value="mittel">Mittel</option>
                <option value="schlecht">Schlecht</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Highlights / Positive Ereignisse</label>
              <textarea value={form.highlights} onChange={e => setForm(f => ({...f, highlights: e.target.value}))} rows={3}
                placeholder="Was war diese Woche besonders schön? Kleine Fortschritte, Freude, Lob…"
                className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background] resize-none" />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Besonderheiten / Auffälligkeiten</label>
              <textarea value={form.besonderheiten} onChange={e => setForm(f => ({...f, besonderheiten: e.target.value}))} rows={3}
                placeholder="Veränderungen, medizinische Auffälligkeiten, Arztbesuche…"
                className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background] resize-none" />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Termine nächste Woche (je Zeile ein Termin)</label>
              <textarea value={form.termine_naechste_woche} onChange={e => setForm(f => ({...f, termine_naechste_woche: e.target.value}))} rows={3}
                placeholder="Mo 09:00 — Arzttermin Dr. Müller&#10;Mi 14:00 — Physiotherapie"
                className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background] resize-none font-mono" />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Persönliche Nachricht an Angehörige</label>
              <textarea value={form.hinweise_angehoerige} onChange={e => setForm(f => ({...f, hinweise_angehoerige: e.target.value}))} rows={3}
                placeholder="Individuelle Grüße oder wichtige Informationen für die Familie…"
                className="w-full px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background] resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => save("entwurf")} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 border border-[--border] rounded-lg text-sm hover:bg-[--muted] disabled:opacity-50">
                <Save className="h-4 w-4" /> {saving ? "Speichere…" : "Entwurf speichern"}
              </button>
              <button onClick={() => save("freigegeben")} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                <Send className="h-4 w-4" /> {saving ? "Speichere…" : "Für Angehörige freigeben"}
              </button>
            </div>

            {bericht && (
              <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                bericht.status === "freigegeben" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
              }`}>
                {bericht.status === "freigegeben"
                  ? <><CheckCircle className="h-4 w-4" /> Freigegeben — Angehörige können diesen Bericht einsehen</>
                  : <><Clock className="h-4 w-4" /> Entwurf gespeichert — noch nicht für Angehörige sichtbar</>
                }
              </div>
            )}
          </div>
        </>
      )}

      {tab === "historie" && (
        <div className="space-y-3">
          {historisch.length === 0 ? (
            <div className="text-center py-12 text-[--muted-foreground]">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Noch keine Wochenberichte erstellt.</p>
            </div>
          ) : historisch.map(b => (
            <div key={b.id} className="bg-[--card] border border-[--border] rounded-xl p-4 flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-sm">{formatDate(b.woche_von)} – {formatDate(b.woche_bis)}</div>
                {b.allgemeinzustand && (
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${ZUSTAND_COLORS[b.allgemeinzustand] ?? "bg-gray-100"}`}>
                    {ZUSTAND_LABELS[b.allgemeinzustand] ?? b.allgemeinzustand}
                  </span>
                )}
                {b.highlights && <p className="text-sm text-[--muted-foreground] mt-1 line-clamp-2">{b.highlights}</p>}
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                b.status === "freigegeben" ? "bg-green-100 text-green-700"
                : b.status === "versendet" ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700"
              }`}>
                {b.status === "freigegeben" ? "Freigegeben" : b.status === "versendet" ? "Versendet" : "Entwurf"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

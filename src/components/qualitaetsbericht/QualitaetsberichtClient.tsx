"use client";

import { useState } from "react";
import {
  BarChart3, CheckCircle, AlertTriangle, FileText, Download,
  RefreshCw, ChevronDown, ChevronUp, Award, TrendingUp, Users, Star
} from "lucide-react";

type BereichItem = { id: string; text: string; gewicht: number; score: number };
type Bereich = { label: string; score: number; items: BereichItem[] };
type Bereiche = { pflege: Bereich; sozial: Bereich; hotel: Bereich; organisation: Bereich };

type Bericht = {
  id: string;
  titel: string;
  zeitraum_von: string;
  zeitraum_bis: string;
  gesamtnote?: number;
  status: string;
  erstellt_am: string;
};

type Props = {
  von: string;
  bis: string;
  anbieterName: string;
  kennzahlen: { bewohnerAnz: number; teamGroesse: number; betreuungsquote: number | null };
  bereiche: Bereiche;
  gesamtscore: number;
  gesamtnote: number;
  empfehlungen: string[];
  massnahmen: string[];
  datengrundlage: Record<string, number>;
  berichteListe: Bericht[];
};

const NOTE_COLORS: (note: number) => string = (note) => {
  if (note <= 1.5) return "text-green-600";
  if (note <= 2.5) return "text-blue-600";
  if (note <= 3.5) return "text-amber-600";
  return "text-red-600";
};

const NOTE_LABELS: (note: number) => string = (note) => {
  if (note <= 1.5) return "Sehr gut";
  if (note <= 2.5) return "Gut";
  if (note <= 3.5) return "Befriedigend";
  if (note <= 4.5) return "Ausreichend";
  return "Mangelhaft";
};

function ScoreBar({ score, color = "bg-blue-500" }: { score: number; color?: string }) {
  return (
    <div className="h-2 bg-[--muted] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${
          score >= 80 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : "bg-red-500"
        }`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

export function QualitaetsberichtClient(props: Props) {
  const { von, bis, anbieterName, kennzahlen, bereiche, gesamtscore, gesamtnote, empfehlungen, massnahmen, datengrundlage, berichteListe } = props;

  const [von2, setVon] = useState(von);
  const [bis2, setBis] = useState(bis);
  const [data, setData] = useState(props);
  const [loading, setLoading] = useState(false);
  const [expandedBereich, setExpandedBereich] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"bericht" | "historie">("bericht");

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/qualitaetsbericht?von=${von2}&bis=${bis2}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const saveBericht = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/qualitaetsbericht", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titel: `MDK-Qualitätsbericht ${von2} bis ${bis2}`,
          zeitraum_von: von2,
          zeitraum_bis: bis2,
          bewohner_anzahl: data.kennzahlen.bewohnerAnz,
          team_groesse: data.kennzahlen.teamGroesse,
          betreuungsquote: data.kennzahlen.betreuungsquote,
          bereich_pflege: data.bereiche.pflege,
          bereich_sozial: data.bereiche.sozial,
          bereich_hotel: data.bereiche.hotel,
          bereich_organisation: data.bereiche.organisation,
          gesamtnote: data.gesamtnote,
          empfehlungen: data.empfehlungen,
          massnahmen: data.massnahmen,
          status: "fertig",
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        // Refresh list
        const listRes = await fetch(`/api/qualitaetsbericht?von=${von2}&bis=${bis2}`);
        if (listRes.ok) {
          const d = await listRes.json();
          setData(prev => ({ ...prev, berichteListe: d.berichteListe }));
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const d = data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Qualitätsbericht</h1>
          <p className="text-sm text-[--muted-foreground] mt-1">
            MDK-konformer Qualitätsbericht nach §115 SGB XI — {anbieterName}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveBericht}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 border border-[--border] rounded-lg text-sm hover:bg-[--muted] transition-colors"
          >
            {saved ? <CheckCircle className="h-4 w-4 text-green-500" /> : <FileText className="h-4 w-4" />}
            {saved ? "Gespeichert!" : saving ? "Speichere…" : "Speichern"}
          </button>
        </div>
      </div>

      {/* Zeitraum-Filter */}
      <div className="bg-[--card] border border-[--border] rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-[--muted-foreground] block mb-1">Von</label>
          <input type="date" value={von2} onChange={e => setVon(e.target.value)}
            className="px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]" />
        </div>
        <div>
          <label className="text-xs text-[--muted-foreground] block mb-1">Bis</label>
          <input type="date" value={bis2} onChange={e => setBis(e.target.value)}
            className="px-3 py-2 border border-[--border] rounded-lg text-sm bg-[--background]" />
        </div>
        <button
          onClick={reload}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[--primary] text-[--primary-foreground] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Berechnen
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[--border]">
        {[
          { key: "bericht", label: "Aktueller Bericht", icon: BarChart3 },
          { key: "historie", label: `Gespeicherte Berichte (${d.berichteListe.length})`, icon: FileText },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? "border-[--primary] text-[--primary]" : "border-transparent text-[--muted-foreground] hover:text-[--foreground]"
            }`}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {tab === "bericht" && (
        <>
          {/* Gesamtnote */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl p-6 flex items-center justify-between">
            <div>
              <div className="text-sm opacity-80 mb-1">MDK-Gesamtnote</div>
              <div className="flex items-baseline gap-3">
                <span className="text-6xl font-bold">{d.gesamtnote.toFixed(1)}</span>
                <span className="text-xl opacity-80">/ 6.0</span>
              </div>
              <div className="text-lg mt-1 opacity-90">{NOTE_LABELS(d.gesamtnote)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-80 mb-1">Punkte</div>
              <div className="text-4xl font-bold">{d.gesamtscore}</div>
              <div className="text-sm opacity-80">von 100</div>
              <div className="mt-3 h-2 w-32 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: `${d.gesamtscore}%` }} />
              </div>
            </div>
          </div>

          {/* KPI-Kacheln */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Bewohner", value: d.kennzahlen.bewohnerAnz, icon: Users, color: "text-blue-600" },
              { label: "Pflegepersonal", value: d.kennzahlen.teamGroesse, icon: Award, color: "text-purple-600" },
              {
                label: "Betreuungsquote",
                value: d.kennzahlen.betreuungsquote ? `1:${(1 / d.kennzahlen.betreuungsquote).toFixed(1)}` : "—",
                icon: TrendingUp, color: "text-green-600",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-[--card] border border-[--border] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="text-xs text-[--muted-foreground]">{label}</span>
                </div>
                <div className="text-2xl font-bold">{value}</div>
              </div>
            ))}
          </div>

          {/* Bereiche */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-[--muted-foreground] uppercase tracking-wider">
              Prüfbereiche (§115 SGB XI)
            </h3>
            {(Object.entries(d.bereiche) as [string, Bereich][]).map(([key, bereich]) => {
              const isExp = expandedBereich === key;
              return (
                <div key={key} className="bg-[--card] border border-[--border] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedBereich(isExp ? null : key)}
                    className="w-full px-4 py-4 flex items-center gap-4 hover:bg-[--muted]/20 transition-colors text-left"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{bereich.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-lg ${
                            bereich.score >= 80 ? "text-green-600" : bereich.score >= 60 ? "text-amber-600" : "text-red-600"
                          }`}>{bereich.score}</span>
                          <span className="text-xs text-[--muted-foreground]">/100</span>
                        </div>
                      </div>
                      <ScoreBar score={bereich.score} />
                    </div>
                    {isExp ? <ChevronUp className="h-4 w-4 shrink-0 text-[--muted-foreground]" /> : <ChevronDown className="h-4 w-4 shrink-0 text-[--muted-foreground]" />}
                  </button>
                  {isExp && (
                    <div className="px-4 pb-4 border-t border-[--border] pt-3 space-y-2.5">
                      {bereich.items.map(item => (
                        <div key={item.id} className="flex items-center gap-3">
                          {item.score >= 80
                            ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            : <AlertTriangle className={`h-4 w-4 shrink-0 ${item.score >= 60 ? "text-amber-500" : "text-red-500"}`} />
                          }
                          <span className="text-sm flex-1">{item.text}</span>
                          <span className={`text-sm font-medium ${item.score >= 80 ? "text-green-600" : item.score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                            {item.score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Empfehlungen & Maßnahmen */}
          {(d.empfehlungen.length > 0 || d.massnahmen.length > 0) && (
            <div className="grid md:grid-cols-2 gap-4">
              {d.empfehlungen.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3 font-semibold text-blue-800 text-sm">
                    <Star className="h-4 w-4" />
                    Empfehlungen ({d.empfehlungen.length})
                  </div>
                  <ul className="space-y-2">
                    {d.empfehlungen.map((e, i) => (
                      <li key={i} className="text-sm text-blue-700 flex gap-2">
                        <span className="shrink-0 font-medium">{i + 1}.</span>{e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {d.massnahmen.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3 font-semibold text-amber-800 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Maßnahmen ({d.massnahmen.length})
                  </div>
                  <ul className="space-y-2">
                    {d.massnahmen.map((m, i) => (
                      <li key={i} className="text-sm text-amber-700 flex gap-2">
                        <span className="shrink-0 font-medium">{i + 1}.</span>{m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Datengrundlage */}
          <div className="bg-[--muted]/20 rounded-xl p-4">
            <div className="text-xs font-medium text-[--muted-foreground] mb-3">Datengrundlage für Zeitraum {von2} – {bis2}</div>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(d.datengrundlage).map(([key, val]) => (
                <div key={key} className="text-center">
                  <div className="text-lg font-bold">{val}</div>
                  <div className="text-xs text-[--muted-foreground] capitalize">{key.replace(/_/g, " ")}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-[--muted-foreground] flex items-start gap-2 p-4 bg-[--muted]/10 rounded-xl">
            <FileText className="h-4 w-4 shrink-0 mt-0.5" />
            Dieser Bericht basiert auf den in xcare erfassten Daten. Die Scores dienen der internen Qualitätssicherung
            und ersetzen keine offizielle MDK-Prüfung nach §114 SGB XI. Bitte mit Ihrem Qualitätsbeauftragten abstimmen.
          </div>
        </>
      )}

      {tab === "historie" && (
        <div className="space-y-3">
          {d.berichteListe.length === 0 ? (
            <div className="text-center py-12 text-[--muted-foreground]">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Noch keine Berichte gespeichert.</p>
              <button
                onClick={() => setTab("bericht")}
                className="mt-4 text-sm text-[--primary] hover:underline"
              >
                Ersten Bericht erstellen →
              </button>
            </div>
          ) : (
            d.berichteListe.map(b => (
              <div key={b.id} className="bg-[--card] border border-[--border] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{b.titel}</div>
                  <div className="text-xs text-[--muted-foreground] mt-0.5">
                    {b.zeitraum_von} – {b.zeitraum_bis} · Erstellt {new Date(b.erstellt_am).toLocaleDateString("de-DE")}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {b.gesamtnote && (
                    <span className={`text-2xl font-bold ${NOTE_COLORS(b.gesamtnote)}`}>
                      {b.gesamtnote.toFixed(1)}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    b.status === "fertig" ? "bg-green-100 text-green-700"
                    : b.status === "eingereicht" ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700"
                  }`}>
                    {b.status === "fertig" ? "Fertig" : b.status === "eingereicht" ? "Eingereicht" : "Entwurf"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

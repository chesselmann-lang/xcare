"use client";

import { useState } from "react";

interface Risiko {
  id: string;
  datum: string;
  sensorische_wahrnehmung: number;
  feuchtigkeit: number;
  aktivitaet: number;
  mobilitaet: number;
  ernaehrung: number;
  reibung_scherkraefte: number;
  braden_score: number;
  risikostufe: string;
  vorhandene_laesionen: string | null;
  hautbefund: string | null;
  massnahmen: string | null;
  naechste_einschaetzung: string | null;
  erstellt_am: string;
}

interface Lagerungsplan {
  id: string;
  intervall_min: number;
  positionen: string[];
  hilfsmittel: string | null;
  besonderheiten: string | null;
  aktiv: boolean;
}

interface Lagerungseintrag {
  id: string;
  datum: string;
  uhrzeit: string;
  position: string;
  hautinspektion: string | null;
  besonderheiten: string | null;
  naechste_lagerung: string | null;
  erstellt_am: string;
}

interface Stats {
  anzahlEinschaetzungen: number;
  letzterBradenScore: number | null;
  aktuelleRisikostufe: string | null;
  naechsteEinschaetzung: string | null;
}

interface LagerungStats {
  heuteAnzahl: number;
  letztePosition: string | null;
  letzteHautinspektion: string | null;
}

interface Props {
  bewohnerId: string;
  bewohnerName: string;
  initialRisiken: Risiko[];
  initialLagerungsplan: Lagerungsplan | null;
  initialStats: Stats;
  initialLagerung: Lagerungseintrag[];
  initialLagerungStats: LagerungStats;
}

const RISIKOSTUFE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  kein_risiko: { label: "Kein Risiko", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  maessig: { label: "Mäßiges Risiko", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  hoch: { label: "Hohes Risiko", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  sehr_hoch: { label: "Sehr hohes Risiko", color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

const BRADEN_SUBSCALEN = [
  { key: "sensorische_wahrnehmung", label: "Sensorische Wahrnehmung", min: 1, max: 4 },
  { key: "feuchtigkeit", label: "Feuchtigkeit", min: 1, max: 4 },
  { key: "aktivitaet", label: "Aktivität", min: 1, max: 4 },
  { key: "mobilitaet", label: "Mobilität", min: 1, max: 4 },
  { key: "ernaehrung", label: "Ernährung", min: 1, max: 4 },
  { key: "reibung_scherkraefte", label: "Reibung & Scherkräfte", min: 1, max: 3 },
] as const;

const POSITIONEN = [
  "Rückenlage",
  "Rechts 30°",
  "Links 30°",
  "Halbseitenlage rechts",
  "Halbseitenlage links",
  "Oberkörperhochlage",
  "Bauchlage",
];

const HAUTINSPEKTION_OPTIONS = [
  { value: "unauffaellig", label: "Unauffällig" },
  { value: "roetung", label: "Rötung" },
  { value: "offene_stelle", label: "Offene Stelle" },
  { value: "blasenbildung", label: "Blasenbildung" },
];

function hautinspektionBadge(value: string | null): string {
  switch (value) {
    case "unauffaellig":
      return "bg-green-100 text-green-700";
    case "roetung":
      return "bg-yellow-100 text-yellow-700";
    case "offene_stelle":
      return "bg-red-100 text-red-700";
    case "blasenbildung":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function hautinspektionLabel(value: string | null): string {
  return HAUTINSPEKTION_OPTIONS.find((o) => o.value === value)?.label ?? value ?? "–";
}

function bradenScoreColor(score: number): string {
  if (score <= 9) return "text-red-600";
  if (score <= 12) return "text-orange-600";
  if (score <= 14) return "text-yellow-600";
  return "text-green-600";
}

function bradenScoreBg(score: number): string {
  if (score <= 9) return "bg-red-50 border-red-300";
  if (score <= 12) return "bg-orange-50 border-orange-300";
  if (score <= 14) return "bg-yellow-50 border-yellow-300";
  return "bg-green-50 border-green-300";
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString("de-DE");
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

export default function DekubitusClient({
  bewohnerId,
  bewohnerName,
  initialRisiken,
  initialLagerungsplan,
  initialStats,
  initialLagerung,
  initialLagerungStats,
}: Props) {
  const [risiken, setRisiken] = useState<Risiko[]>(initialRisiken);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [lagerungsplan, setLagerungsplan] = useState<Lagerungsplan | null>(initialLagerungsplan);
  const [lagerung, setLagerung] = useState<Lagerungseintrag[]>(initialLagerung);
  const [lagerungStats, setLagerungStats] = useState<LagerungStats>(initialLagerungStats);
  const [activeTab, setActiveTab] = useState<"einschaetzung" | "lagerungsplan" | "protokoll">("einschaetzung");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Braden form state
  const [bradenForm, setBradenForm] = useState({
    datum: todayStr(),
    sensorische_wahrnehmung: 0,
    feuchtigkeit: 0,
    aktivitaet: 0,
    mobilitaet: 0,
    ernaehrung: 0,
    reibung_scherkraefte: 0,
    vorhandene_laesionen: "",
    hautbefund: "",
    massnahmen: "",
    naechste_einschaetzung: "",
  });

  // Lagerungsplan form state
  const [planForm, setPlanForm] = useState({
    intervall_min: lagerungsplan?.intervall_min ?? 120,
    positionen: lagerungsplan?.positionen ?? ([] as string[]),
    hilfsmittel: lagerungsplan?.hilfsmittel ?? "",
    besonderheiten: lagerungsplan?.besonderheiten ?? "",
  });

  // Lagerung form state
  const [lagerungForm, setLagerungForm] = useState({
    datum: todayStr(),
    uhrzeit: nowTimeStr(),
    position: "",
    positionFreitext: "",
    hautinspektion: "unauffaellig",
    besonderheiten: "",
    naechste_lagerung: "",
  });

  const bradenScore =
    (bradenForm.sensorische_wahrnehmung || 0) +
    (bradenForm.feuchtigkeit || 0) +
    (bradenForm.aktivitaet || 0) +
    (bradenForm.mobilitaet || 0) +
    (bradenForm.ernaehrung || 0) +
    (bradenForm.reibung_scherkraefte || 0);

  const sortedRisiken = [...risiken].sort(
    (a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime()
  );

  function openForm() {
    if (activeTab === "einschaetzung") {
      setBradenForm({
        datum: todayStr(),
        sensorische_wahrnehmung: 0,
        feuchtigkeit: 0,
        aktivitaet: 0,
        mobilitaet: 0,
        ernaehrung: 0,
        reibung_scherkraefte: 0,
        vorhandene_laesionen: "",
        hautbefund: "",
        massnahmen: "",
        naechste_einschaetzung: "",
      });
    } else if (activeTab === "lagerungsplan") {
      setPlanForm({
        intervall_min: lagerungsplan?.intervall_min ?? 120,
        positionen: lagerungsplan?.positionen ?? [],
        hilfsmittel: lagerungsplan?.hilfsmittel ?? "",
        besonderheiten: lagerungsplan?.besonderheiten ?? "",
      });
    } else {
      setLagerungForm({
        datum: todayStr(),
        uhrzeit: nowTimeStr(),
        position: "",
        positionFreitext: "",
        hautinspektion: "unauffaellig",
        besonderheiten: "",
        naechste_lagerung: "",
      });
    }
    setShowForm(true);
  }

  async function saveBraden() {
    setSaving(true);
    try {
      const res = await fetch(`/api/bewohner/${bewohnerId}/dekubitus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bradenForm),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.risiko) setRisiken((prev) => [data.risiko, ...prev]);
        if (data.stats) setStats(data.stats);
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function savePlan() {
    setSaving(true);
    try {
      const res = await fetch(`/api/bewohner/${bewohnerId}/dekubitus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ update_lagerungsplan: true, ...planForm }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.lagerungsplan) setLagerungsplan(data.lagerungsplan);
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveLagerung() {
    setSaving(true);
    try {
      const position = lagerungForm.position || lagerungForm.positionFreitext;
      const res = await fetch(`/api/bewohner/${bewohnerId}/lagerung`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datum: lagerungForm.datum,
          uhrzeit: lagerungForm.uhrzeit,
          position,
          hautinspektion: lagerungForm.hautinspektion,
          besonderheiten: lagerungForm.besonderheiten || null,
          naechste_lagerung: lagerungForm.naechste_lagerung || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.eintrag) setLagerung((prev) => [data.eintrag, ...prev]);
        if (data.stats) setLagerungStats(data.stats);
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  function togglePlanPosition(pos: string) {
    setPlanForm((prev) => ({
      ...prev,
      positionen: prev.positionen.includes(pos)
        ? prev.positionen.filter((p) => p !== pos)
        : [...prev.positionen, pos],
    }));
  }

  const risikoCfg = stats.aktuelleRisikostufe ? RISIKOSTUFE_CONFIG[stats.aktuelleRisikostufe] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dekubitus-Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">{bewohnerName}</p>
        </div>
        <button
          onClick={openForm}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          {activeTab === "einschaetzung"
            ? "Neue Einschätzung"
            : activeTab === "lagerungsplan"
            ? lagerungsplan
              ? "Plan bearbeiten"
              : "Plan anlegen"
            : "Lagerung erfassen"}
        </button>
      </div>

      {/* Risk banner */}
      {risikoCfg && stats.letzterBradenScore !== null && (
        <div className={`rounded-lg border p-4 ${risikoCfg.bg}`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className={`text-sm font-semibold ${risikoCfg.color}`}>
                {risikoCfg.label}
              </span>
              <span className={`text-sm ${risikoCfg.color}`}>
                Braden-Score: <strong>{stats.letzterBradenScore}</strong>
              </span>
            </div>
            {stats.naechsteEinschaetzung && (
              <span className="text-sm text-gray-600">
                Nächste Einschätzung: {formatDate(stats.naechsteEinschaetzung)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {(
            [
              { key: "einschaetzung", label: "Risikoeinschätzungen" },
              { key: "lagerungsplan", label: "Lagerungsplan" },
              { key: "protokoll", label: "Lagerungsprotokoll" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setShowForm(false); }}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ─── TAB: Risikoeinschätzungen ─── */}
      {activeTab === "einschaetzung" && (
        <div className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Einschätzungen gesamt</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{stats.anzahlEinschaetzungen}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Letzter Braden-Score</p>
              {stats.letzterBradenScore !== null ? (
                <div className="mt-1 flex items-baseline gap-2">
                  <p className={`text-3xl font-bold ${bradenScoreColor(stats.letzterBradenScore)}`}>
                    {stats.letzterBradenScore}
                  </p>
                  {stats.aktuelleRisikostufe && RISIKOSTUFE_CONFIG[stats.aktuelleRisikostufe] && (
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium border ${
                        RISIKOSTUFE_CONFIG[stats.aktuelleRisikostufe].bg
                      } ${RISIKOSTUFE_CONFIG[stats.aktuelleRisikostufe].color}`}
                    >
                      {RISIKOSTUFE_CONFIG[stats.aktuelleRisikostufe].label}
                    </span>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-3xl font-bold text-gray-400">–</p>
              )}
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nächste Einschätzung</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">
                {stats.naechsteEinschaetzung ? formatDate(stats.naechsteEinschaetzung) : "–"}
              </p>
            </div>
          </div>

          {/* List */}
          {sortedRisiken.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
              <p className="text-gray-500">Noch keine Risikoeinschätzungen erfasst.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedRisiken.map((r) => {
                const cfg = RISIKOSTUFE_CONFIG[r.risikostufe];
                return (
                  <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border-2 font-bold text-xl ${bradenScoreBg(r.braden_score)} ${bradenScoreColor(r.braden_score)}`}
                        >
                          {r.braden_score}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{formatDate(r.datum)}</p>
                          {cfg && (
                            <span
                              className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium border ${cfg.bg} ${cfg.color}`}
                            >
                              {cfg.label}
                            </span>
                          )}
                        </div>
                      </div>
                      {r.massnahmen && (
                        <p className="text-sm text-gray-600 max-w-sm line-clamp-2">{r.massnahmen}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: Lagerungsplan ─── */}
      {activeTab === "lagerungsplan" && (
        <div className="space-y-4">
          {lagerungsplan ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500">Umlagerungsintervall:</span>
                <span className="font-semibold text-gray-900">{lagerungsplan.intervall_min} Minuten</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Positionen:</p>
                <div className="flex flex-wrap gap-2">
                  {lagerungsplan.positionen.map((pos) => (
                    <span
                      key={pos}
                      className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700"
                    >
                      {pos}
                    </span>
                  ))}
                </div>
              </div>
              {lagerungsplan.hilfsmittel && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Hilfsmittel:</p>
                  <p className="text-sm text-gray-900 mt-1">{lagerungsplan.hilfsmittel}</p>
                </div>
              )}
              {lagerungsplan.besonderheiten && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Besonderheiten:</p>
                  <p className="text-sm text-gray-900 mt-1">{lagerungsplan.besonderheiten}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
              <p className="text-gray-500">Kein Lagerungsplan erfasst.</p>
              <p className="text-sm text-gray-400 mt-1">Legen Sie einen Lagerungsplan über den Button oben an.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: Lagerungsprotokoll ─── */}
      {activeTab === "protokoll" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lagerungen heute</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{lagerungStats.heuteAnzahl}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Letzte Position</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{lagerungStats.letztePosition ?? "–"}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Letzte Hautinspektion</p>
              {lagerungStats.letzteHautinspektion ? (
                <span
                  className={`mt-2 inline-block rounded px-2 py-1 text-sm font-medium ${hautinspektionBadge(lagerungStats.letzteHautinspektion)}`}
                >
                  {hautinspektionLabel(lagerungStats.letzteHautinspektion)}
                </span>
              ) : (
                <p className="mt-1 text-lg font-semibold text-gray-400">–</p>
              )}
            </div>
          </div>

          {/* List */}
          {lagerung.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
              <p className="text-gray-500">Noch keine Lagerungseinträge vorhanden.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Datum</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Uhrzeit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Position</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Hautinspektion</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Nächste Lagerung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lagerung.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{formatDate(e.datum)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{e.uhrzeit}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{e.position}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${hautinspektionBadge(e.hautinspektion)}`}>
                          {hautinspektionLabel(e.hautinspektion)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {e.naechste_lagerung ? formatDateTime(e.naechste_lagerung) : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: Braden Einschätzung ─── */}
      {showForm && activeTab === "einschaetzung" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Neue Braden-Einschätzung</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                <input
                  type="date"
                  value={bradenForm.datum}
                  onChange={(e) => setBradenForm((f) => ({ ...f, datum: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Live score */}
              <div className={`rounded-lg border-2 p-4 text-center ${bradenScore > 0 ? bradenScoreBg(bradenScore) : "bg-gray-50 border-gray-200"}`}>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Braden-Score (Summe)</p>
                <p className={`text-5xl font-bold mt-1 ${bradenScore > 0 ? bradenScoreColor(bradenScore) : "text-gray-400"}`}>
                  {bradenScore > 0 ? bradenScore : "–"}
                </p>
                {bradenScore > 0 && (
                  <p className="text-sm mt-1 text-gray-600">
                    {bradenScore <= 9 ? "Sehr hohes Risiko" : bradenScore <= 12 ? "Hohes Risiko" : bradenScore <= 14 ? "Mäßiges Risiko" : "Kein Risiko"}
                  </p>
                )}
              </div>

              {/* Subscales */}
              {BRADEN_SUBSCALEN.map((s) => (
                <div key={s.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {s.label}{" "}
                    <span className="text-gray-400 font-normal">({s.min}–{s.max})</span>
                  </label>
                  <div className="flex gap-2">
                    {Array.from({ length: s.max - s.min + 1 }, (_, i) => i + s.min).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setBradenForm((f) => ({ ...f, [s.key]: v }))}
                        className={`flex-1 rounded-lg border-2 py-2 text-sm font-semibold transition-colors ${
                          (bradenForm as Record<string, number>)[s.key] === v
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:border-blue-400"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vorhandene Läsionen</label>
                <textarea
                  rows={2}
                  value={bradenForm.vorhandene_laesionen}
                  onChange={(e) => setBradenForm((f) => ({ ...f, vorhandene_laesionen: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Beschreibung vorhandener Läsionen …"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hautbefund</label>
                <textarea
                  rows={2}
                  value={bradenForm.hautbefund}
                  onChange={(e) => setBradenForm((f) => ({ ...f, hautbefund: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Allgemeiner Hautbefund …"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maßnahmen</label>
                <textarea
                  rows={3}
                  value={bradenForm.massnahmen}
                  onChange={(e) => setBradenForm((f) => ({ ...f, massnahmen: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Geplante Maßnahmen …"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nächste Einschätzung</label>
                <input
                  type="date"
                  value={bradenForm.naechste_einschaetzung}
                  onChange={(e) => setBradenForm((f) => ({ ...f, naechste_einschaetzung: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={saveBraden}
                disabled={saving || bradenScore === 0}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Speichern …" : "Einschätzung speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Lagerungsplan ─── */}
      {showForm && activeTab === "lagerungsplan" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {lagerungsplan ? "Lagerungsplan bearbeiten" : "Lagerungsplan anlegen"}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Umlagerungsintervall (Minuten)
                </label>
                <input
                  type="number"
                  min={30}
                  step={30}
                  value={planForm.intervall_min}
                  onChange={(e) => setPlanForm((f) => ({ ...f, intervall_min: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Positionen</label>
                <div className="flex flex-wrap gap-2">
                  {POSITIONEN.map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => togglePlanPosition(pos)}
                      className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                        planForm.positionen.includes(pos)
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:border-blue-400"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hilfsmittel</label>
                <textarea
                  rows={2}
                  value={planForm.hilfsmittel}
                  onChange={(e) => setPlanForm((f) => ({ ...f, hilfsmittel: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Verwendete Hilfsmittel (z.B. Lagerungskissen) …"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Besonderheiten</label>
                <textarea
                  rows={2}
                  value={planForm.besonderheiten}
                  onChange={(e) => setPlanForm((f) => ({ ...f, besonderheiten: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Besonderheiten oder Einschränkungen …"
                />
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={savePlan}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Speichern …" : "Plan speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Lagerung erfassen ─── */}
      {showForm && activeTab === "protokoll" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Lagerung erfassen</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                  <input
                    type="date"
                    value={lagerungForm.datum}
                    onChange={(e) => setLagerungForm((f) => ({ ...f, datum: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uhrzeit</label>
                  <input
                    type="time"
                    value={lagerungForm.uhrzeit}
                    onChange={(e) => setLagerungForm((f) => ({ ...f, uhrzeit: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {POSITIONEN.map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setLagerungForm((f) => ({ ...f, position: pos, positionFreitext: "" }))}
                      className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                        lagerungForm.position === pos
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:border-blue-400"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={lagerungForm.positionFreitext}
                  onChange={(e) => setLagerungForm((f) => ({ ...f, positionFreitext: e.target.value, position: "" }))}
                  placeholder="Oder Freitext eingeben …"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hautinspektion</label>
                <select
                  value={lagerungForm.hautinspektion}
                  onChange={(e) => setLagerungForm((f) => ({ ...f, hautinspektion: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {HAUTINSPEKTION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Besonderheiten</label>
                <textarea
                  rows={2}
                  value={lagerungForm.besonderheiten}
                  onChange={(e) => setLagerungForm((f) => ({ ...f, besonderheiten: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Auffälligkeiten, Beschwerden …"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nächste Lagerung</label>
                <input
                  type="datetime-local"
                  value={lagerungForm.naechste_lagerung}
                  onChange={(e) => setLagerungForm((f) => ({ ...f, naechste_lagerung: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={saveLagerung}
                disabled={saving || (!lagerungForm.position && !lagerungForm.positionFreitext)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Speichern …" : "Lagerung speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

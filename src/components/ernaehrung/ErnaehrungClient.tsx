"use client";

import { useState } from "react";

interface Protokoll {
  id: string;
  datum: string;
  mahlzeit: string;
  angeboten: boolean;
  aufgenommen_prozent: number | null;
  kostform: string | null;
  appetit: string | null;
  zusatznahrung: boolean;
  zusatznahrung_typ: string | null;
  gewicht_kg: number | null;
  besonderheiten: string | null;
  erstellt_am: string;
}

interface Fluessigkeit {
  id: string;
  datum: string;
  uhrzeit: string;
  menge_ml: number;
  bilanz_typ: string;
  art: string;
  besonderheiten: string | null;
}

interface Ziele {
  kostform: string | null;
  kalorien_ziel: number;
  fluessigkeit_ziel_ml: number;
  allergie_unvertraeglichkeit: string | null;
  besondere_ernaehrung: string | null;
  mna_score: number | null;
}

interface Stats {
  gesamt: number;
  durchschnittAufnahme: number;
  letztesGewicht: number | null;
  mnaScore: number | null;
}

interface FlStats {
  einfuhrHeute: number;
  ausfuhrHeute: number;
  bilanzHeute: number;
}

interface Props {
  bewohnerId: string;
  bewohnerName: string;
  initialProtokoll: Protokoll[];
  initialZiele: Ziele | null;
  initialStats: Stats;
  initialFluessigkeit: Fluessigkeit[];
  initialFlStats: FlStats;
}

const MAHLZEIT_LABELS: Record<string, string> = {
  fruehstueck: "Frühstück 🌅",
  zwischenmahlzeit_vm: "ZM Vormittag ☕",
  mittagessen: "Mittagessen 🍽️",
  zwischenmahlzeit_nm: "ZM Nachmittag 🍎",
  abendessen: "Abendessen 🌙",
  spaetmahlzeit: "Spätmahlzeit 🌛",
};

const APPETIT_COLORS: Record<string, string> = {
  gut: "text-green-600",
  maessig: "text-yellow-600",
  schlecht: "text-red-600",
  verweigert: "text-red-800",
};

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ErnaehrungClient({
  bewohnerId,
  bewohnerName,
  initialProtokoll,
  initialZiele,
  initialStats,
  initialFluessigkeit,
  initialFlStats,
}: Props) {
  const [protokoll, setProtokoll] = useState<Protokoll[]>(initialProtokoll);
  const [ziele, setZiele] = useState<Ziele | null>(initialZiele);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [fluessigkeit, setFluessigkeit] = useState<Fluessigkeit[]>(initialFluessigkeit);
  const [flStats, setFlStats] = useState<FlStats>(initialFlStats);
  const [activeTab, setActiveTab] = useState<"ernaehrung" | "fluessigkeit" | "ziele">("ernaehrung");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mahlzeit form state
  const [mDatum, setMDatum] = useState(today());
  const [mMahlzeit, setMMahlzeit] = useState("");
  const [mAufgenommen, setMAufgenommen] = useState(75);
  const [mAngeboten, setMAngeboten] = useState(true);
  const [mKostform, setMKostform] = useState("normal");
  const [mAppetit, setMAppetit] = useState("gut");
  const [mZusatznahrung, setMZusatznahrung] = useState(false);
  const [mZusatznahrungTyp, setMZusatznahrungTyp] = useState("");
  const [mGewicht, setMGewicht] = useState<string>("");
  const [mBesonderheiten, setMBesonderheiten] = useState("");

  // Fluessigkeit form state
  const [fBilanzTyp, setFBilanzTyp] = useState<"einfuhr" | "ausfuhr">("einfuhr");
  const [fMenge, setFMenge] = useState<string>("");
  const [fArt, setFArt] = useState("");
  const [fDatum, setFDatum] = useState(today());
  const [fUhrzeit, setFUhrzeit] = useState(nowTime());
  const [fBesonderheiten, setFBesonderheiten] = useState("");

  // Ziele form state
  const [zKostform, setZKostform] = useState(ziele?.kostform ?? "normal");
  const [zKalorien, setZKalorien] = useState<string>(String(ziele?.kalorien_ziel ?? 2000));
  const [zFluessigkeit, setZFluessigkeit] = useState<string>(String(ziele?.fluessigkeit_ziel_ml ?? 1500));
  const [zAllergie, setZAllergie] = useState(ziele?.allergie_unvertraeglichkeit ?? "");
  const [zBesondere, setZBesondere] = useState(ziele?.besondere_ernaehrung ?? "");
  const [zMna, setZMna] = useState<string>(ziele?.mna_score != null ? String(ziele.mna_score) : "");

  function resetMahlzeitForm() {
    setMDatum(today());
    setMMahlzeit("");
    setMAufgenommen(75);
    setMAngeboten(true);
    setMKostform("normal");
    setMAppetit("gut");
    setMZusatznahrung(false);
    setMZusatznahrungTyp("");
    setMGewicht("");
    setMBesonderheiten("");
  }

  function resetFlForm() {
    setFBilanzTyp("einfuhr");
    setFMenge("");
    setFArt("");
    setFDatum(today());
    setFUhrzeit(nowTime());
    setFBesonderheiten("");
  }

  function openForm() {
    if (activeTab === "ernaehrung") resetMahlzeitForm();
    if (activeTab === "fluessigkeit") resetFlForm();
    if (activeTab === "ziele") {
      setZKostform(ziele?.kostform ?? "normal");
      setZKalorien(String(ziele?.kalorien_ziel ?? 2000));
      setZFluessigkeit(String(ziele?.fluessigkeit_ziel_ml ?? 1500));
      setZAllergie(ziele?.allergie_unvertraeglichkeit ?? "");
      setZBesondere(ziele?.besondere_ernaehrung ?? "");
      setZMna(ziele?.mna_score != null ? String(ziele.mna_score) : "");
    }
    setShowForm(true);
  }

  async function refreshErnaehrung() {
    const res = await fetch(`/api/bewohner/${bewohnerId}/ernaehrung`);
    if (res.ok) {
      const data = await res.json();
      if (data.protokoll) setProtokoll(data.protokoll);
      if (data.stats) setStats(data.stats);
      if (data.ziele !== undefined) setZiele(data.ziele);
    }
  }

  async function refreshFluessigkeit() {
    const res = await fetch(`/api/bewohner/${bewohnerId}/fluessigkeit`);
    if (res.ok) {
      const data = await res.json();
      if (data.eintraege) setFluessigkeit(data.eintraege);
      if (data.stats) setFlStats(data.stats);
    }
  }

  async function saveMahlzeit() {
    if (!mMahlzeit) return;
    setSaving(true);
    try {
      const body = {
        datum: mDatum,
        mahlzeit: mMahlzeit,
        angeboten: mAngeboten,
        aufgenommen_prozent: mAufgenommen,
        kostform: mKostform,
        appetit: mAppetit,
        zusatznahrung: mZusatznahrung,
        zusatznahrung_typ: mZusatznahrung ? mZusatznahrungTyp : null,
        gewicht_kg: mGewicht !== "" ? parseFloat(mGewicht) : null,
        besonderheiten: mBesonderheiten || null,
      };
      const res = await fetch(`/api/bewohner/${bewohnerId}/ernaehrung`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await refreshErnaehrung();
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveFluessigkeit() {
    if (!fMenge || !fArt) return;
    setSaving(true);
    try {
      const body = {
        bilanz_typ: fBilanzTyp,
        menge_ml: parseInt(fMenge, 10),
        art: fArt,
        datum: fDatum,
        uhrzeit: fUhrzeit,
        besonderheiten: fBesonderheiten || null,
      };
      const res = await fetch(`/api/bewohner/${bewohnerId}/fluessigkeit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await refreshFluessigkeit();
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveZiele() {
    setSaving(true);
    try {
      const body = {
        update_ziele: true,
        kostform: zKostform,
        kalorien_ziel: parseInt(zKalorien, 10),
        fluessigkeit_ziel_ml: parseInt(zFluessigkeit, 10),
        allergie_unvertraeglichkeit: zAllergie || null,
        besondere_ernaehrung: zBesondere || null,
        mna_score: zMna !== "" ? parseFloat(zMna) : null,
      };
      const res = await fetch(`/api/bewohner/${bewohnerId}/ernaehrung`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await refreshErnaehrung();
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  function aufnahmeColor(pct: number | null): string {
    if (pct === null) return "bg-gray-300";
    if (pct >= 75) return "bg-green-500";
    if (pct >= 50) return "bg-yellow-400";
    return "bg-red-500";
  }

  const fluessigkeitZiel = ziele?.fluessigkeit_ziel_ml ?? 1500;
  const einfuhrPct = Math.min(100, Math.round((flStats.einfuhrHeute / fluessigkeitZiel) * 100));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Ernährung &amp; Flüssigkeit
          </h2>
          <p className="text-sm text-gray-500">{bewohnerName}</p>
        </div>
        <button
          onClick={openForm}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span>+</span>
          {activeTab === "ernaehrung" && "Mahlzeit erfassen"}
          {activeTab === "fluessigkeit" && "Einfuhr/Ausfuhr erfassen"}
          {activeTab === "ziele" && "Ziele bearbeiten"}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {(["ernaehrung", "fluessigkeit", "ziele"] as const).map((tab) => {
            const labels = {
              ernaehrung: "Ernährungsprotokoll",
              fluessigkeit: "Flüssigkeitsbilanz",
              ziele: "Ernährungsziele",
            };
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setShowForm(false); }}
                className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── ERNÄHRUNGSPROTOKOLL TAB ── */}
      {activeTab === "ernaehrung" && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Einträge gesamt</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.gesamt}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Ø Aufnahme</p>
              <p className={`mt-1 text-2xl font-bold ${
                stats.durchschnittAufnahme >= 75
                  ? "text-green-600"
                  : stats.durchschnittAufnahme >= 50
                  ? "text-yellow-600"
                  : "text-red-600"
              }`}>
                {stats.durchschnittAufnahme}%
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Letztes Gewicht</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.letztesGewicht != null ? `${stats.letztesGewicht} kg` : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">MNA-Score</p>
              <p className={`mt-1 text-2xl font-bold ${
                stats.mnaScore === null
                  ? "text-gray-400"
                  : stats.mnaScore >= 12
                  ? "text-green-600"
                  : stats.mnaScore >= 8
                  ? "text-yellow-600"
                  : "text-red-600"
              }`}>
                {stats.mnaScore != null ? `${stats.mnaScore}/30` : "—"}
              </p>
            </div>
          </div>

          {/* Protokoll List */}
          {protokoll.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
              <p className="text-gray-500">Noch keine Mahlzeiten erfasst.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Datum</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Mahlzeit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Aufnahme</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Appetit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Gewicht</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {protokoll.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                        {new Date(p.datum).toLocaleDateString("de-DE")}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {MAHLZEIT_LABELS[p.mahlzeit] ?? p.mahlzeit}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className={`h-2 rounded-full ${aufnahmeColor(p.aufgenommen_prozent)}`}
                              style={{ width: `${p.aufgenommen_prozent ?? 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">
                            {p.aufgenommen_prozent != null ? `${p.aufgenommen_prozent}%` : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {p.appetit ? (
                          <span className={`font-medium ${APPETIT_COLORS[p.appetit] ?? "text-gray-700"}`}>
                            {p.appetit.charAt(0).toUpperCase() + p.appetit.slice(1)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {p.gewicht_kg != null ? `${p.gewicht_kg} kg` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mahlzeit Modal */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh]">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Mahlzeit erfassen</h3>
                  <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                </div>

                <div className="space-y-4">
                  {/* Datum */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                    <input
                      type="date"
                      value={mDatum}
                      onChange={(e) => setMDatum(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Mahlzeit Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mahlzeit</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(MAHLZEIT_LABELS).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setMMahlzeit(key)}
                          className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                            mMahlzeit === key
                              ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Aufgenommen Slider */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Aufnahme: <span className="font-bold text-blue-600">{mAufgenommen}%</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={mAufgenommen}
                      onChange={(e) => setMAufgenommen(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                    </div>
                  </div>

                  {/* Angeboten Toggle */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMAngeboten(!mAngeboten)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${mAngeboten ? "bg-blue-600" : "bg-gray-200"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${mAngeboten ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                    <span className="text-sm text-gray-700">Mahlzeit angeboten</span>
                  </div>

                  {/* Kostform */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kostform</label>
                    <select
                      value={mKostform}
                      onChange={(e) => setMKostform(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="normal">Normal</option>
                      <option value="weich">Weich</option>
                      <option value="passiert">Passiert</option>
                      <option value="fluessig">Flüssig</option>
                      <option value="sonde">Sonde</option>
                      <option value="tpn">TPN (parenterale Ernährung)</option>
                    </select>
                  </div>

                  {/* Appetit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Appetit</label>
                    <select
                      value={mAppetit}
                      onChange={(e) => setMAppetit(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="gut">Gut</option>
                      <option value="maessig">Mäßig</option>
                      <option value="schlecht">Schlecht</option>
                      <option value="verweigert">Verweigert</option>
                    </select>
                  </div>

                  {/* Zusatznahrung */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mZusatznahrung}
                        onChange={(e) => setMZusatznahrung(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Zusatznahrung</span>
                    </label>
                    {mZusatznahrung && (
                      <input
                        type="text"
                        placeholder="Art der Zusatznahrung (z.B. Fresubin)"
                        value={mZusatznahrungTyp}
                        onChange={(e) => setMZusatznahrungTyp(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    )}
                  </div>

                  {/* Gewicht */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gewicht (kg, optional)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="20"
                      max="300"
                      placeholder="z.B. 72.5"
                      value={mGewicht}
                      onChange={(e) => setMGewicht(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Besonderheiten */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Besonderheiten (optional)</label>
                    <textarea
                      rows={2}
                      placeholder="Sonstige Beobachtungen..."
                      value={mBesonderheiten}
                      onChange={(e) => setMBesonderheiten(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={saveMahlzeit}
                    disabled={saving || !mMahlzeit}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Speichern..." : "Speichern"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FLÜSSIGKEITSBILANZ TAB ── */}
      {activeTab === "fluessigkeit" && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Einfuhr heute</p>
              <p className="mt-1 text-2xl font-bold text-blue-800">{flStats.einfuhrHeute} ml</p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-orange-600">Ausfuhr heute</p>
              <p className="mt-1 text-2xl font-bold text-orange-800">{flStats.ausfuhrHeute} ml</p>
            </div>
            <div className={`rounded-xl border p-4 shadow-sm ${
              flStats.bilanzHeute >= 0
                ? "border-green-100 bg-green-50"
                : "border-red-100 bg-red-50"
            }`}>
              <p className={`text-xs font-medium uppercase tracking-wide ${flStats.bilanzHeute >= 0 ? "text-green-600" : "text-red-600"}`}>
                Bilanz heute
              </p>
              <p className={`mt-1 text-2xl font-bold ${flStats.bilanzHeute >= 0 ? "text-green-800" : "text-red-800"}`}>
                {flStats.bilanzHeute >= 0 ? "+" : ""}{flStats.bilanzHeute} ml
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Trinkmenge heute</span>
              <span className="text-gray-500">{flStats.einfuhrHeute} / {fluessigkeitZiel} ml ({einfuhrPct}%)</span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-4 rounded-full transition-all ${einfuhrPct >= 100 ? "bg-green-500" : einfuhrPct >= 60 ? "bg-blue-500" : "bg-yellow-400"}`}
                style={{ width: `${Math.min(einfuhrPct, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">Ziel: {fluessigkeitZiel} ml / Tag</p>
          </div>

          {/* Fluid List */}
          {fluessigkeit.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
              <p className="text-gray-500">Noch keine Einträge für heute.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {fluessigkeit.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      f.bilanz_typ === "einfuhr"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-orange-100 text-orange-700"
                    }`}>
                      {f.bilanz_typ === "einfuhr" ? "Einfuhr" : "Ausfuhr"}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{f.art}</p>
                      {f.besonderheiten && (
                        <p className="text-xs text-gray-500">{f.besonderheiten}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{f.menge_ml} ml</p>
                    <p className="text-xs text-gray-400">{f.uhrzeit} Uhr</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fluid Modal */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Einfuhr / Ausfuhr erfassen</h3>
                  <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                </div>

                <div className="space-y-4">
                  {/* Bilanz Typ Toggle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Typ</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFBilanzTyp("einfuhr")}
                        className={`rounded-lg border py-3 text-sm font-medium transition-colors ${
                          fBilanzTyp === "einfuhr"
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        💧 Einfuhr
                      </button>
                      <button
                        type="button"
                        onClick={() => setFBilanzTyp("ausfuhr")}
                        className={`rounded-lg border py-3 text-sm font-medium transition-colors ${
                          fBilanzTyp === "ausfuhr"
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        🔴 Ausfuhr
                      </button>
                    </div>
                  </div>

                  {/* Menge */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Menge (ml)</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      placeholder="z.B. 200"
                      value={fMenge}
                      onChange={(e) => setFMenge(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Art */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Art</label>
                    <input
                      type="text"
                      placeholder={fBilanzTyp === "einfuhr" ? "z.B. Wasser, Kaffee, Tee" : "z.B. Urin, Erbrochenes"}
                      value={fArt}
                      onChange={(e) => setFArt(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Datum + Uhrzeit */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                      <input
                        type="date"
                        value={fDatum}
                        onChange={(e) => setFDatum(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Uhrzeit</label>
                      <input
                        type="time"
                        value={fUhrzeit}
                        onChange={(e) => setFUhrzeit(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Besonderheiten */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Besonderheiten (optional)</label>
                    <textarea
                      rows={2}
                      placeholder="Sonstige Beobachtungen..."
                      value={fBesonderheiten}
                      onChange={(e) => setFBesonderheiten(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={saveFluessigkeit}
                    disabled={saving || !fMenge || !fArt}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Speichern..." : "Speichern"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ERNÄHRUNGSZIELE TAB ── */}
      {activeTab === "ziele" && (
        <div className="space-y-6">
          {ziele === null ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
              <p className="text-gray-500 font-medium">Keine Ernährungsziele erfasst</p>
              <p className="text-sm text-gray-400 mt-1">Klicke auf &quot;Ziele bearbeiten&quot;, um Ziele anzulegen.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Kostform</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 capitalize">{ziele.kostform ?? "Normal"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Kalorienziel</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{ziele.kalorien_ziel} kcal/Tag</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Flüssigkeitsziel</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{ziele.fluessigkeit_ziel_ml} ml/Tag</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">MNA-Score</p>
                  <p className={`mt-1 text-sm font-semibold ${
                    ziele.mna_score === null
                      ? "text-gray-400"
                      : ziele.mna_score >= 12
                      ? "text-green-600"
                      : ziele.mna_score >= 8
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}>
                    {ziele.mna_score != null ? `${ziele.mna_score}/30` : "—"}
                  </p>
                </div>
              </div>
              {ziele.allergie_unvertraeglichkeit && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Allergie / Unverträglichkeit</p>
                  <p className="mt-1 text-sm text-gray-900">{ziele.allergie_unvertraeglichkeit}</p>
                </div>
              )}
              {ziele.besondere_ernaehrung && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Besondere Ernährungshinweise</p>
                  <p className="mt-1 text-sm text-gray-900">{ziele.besondere_ernaehrung}</p>
                </div>
              )}
            </div>
          )}

          {/* Ziele Modal */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh]">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Ernährungsziele bearbeiten</h3>
                  <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                </div>

                <div className="space-y-4">
                  {/* Kostform */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kostform</label>
                    <select
                      value={zKostform}
                      onChange={(e) => setZKostform(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="normal">Normal</option>
                      <option value="weich">Weich</option>
                      <option value="passiert">Passiert</option>
                      <option value="fluessig">Flüssig</option>
                      <option value="sonde">Sonde</option>
                      <option value="tpn">TPN (parenterale Ernährung)</option>
                    </select>
                  </div>

                  {/* Kalorienziel */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kalorienziel (kcal/Tag)</label>
                    <input
                      type="number"
                      min="500"
                      max="5000"
                      step="50"
                      value={zKalorien}
                      onChange={(e) => setZKalorien(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Flüssigkeitsziel */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Flüssigkeitsziel (ml/Tag)</label>
                    <input
                      type="number"
                      min="500"
                      max="5000"
                      step="50"
                      value={zFluessigkeit}
                      onChange={(e) => setZFluessigkeit(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Allergie */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Allergie / Unverträglichkeit</label>
                    <textarea
                      rows={2}
                      placeholder="z.B. Laktoseintoleranz, Glutenunverträglichkeit..."
                      value={zAllergie}
                      onChange={(e) => setZAllergie(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Besondere Ernährung */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Besondere Ernährungshinweise</label>
                    <textarea
                      rows={2}
                      placeholder="z.B. Schluckstörung, Verdickungsmittel nötig..."
                      value={zBesondere}
                      onChange={(e) => setZBesondere(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* MNA-Score */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">MNA-Score (0–30, optional)</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      step="0.5"
                      placeholder="z.B. 22"
                      value={zMna}
                      onChange={(e) => setZMna(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-400">≥12 Normal · 8–11 Risiko · &lt;8 Mangelernährt</p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={saveZiele}
                    disabled={saving}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Speichern..." : "Speichern"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

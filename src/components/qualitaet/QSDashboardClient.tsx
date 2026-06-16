"use client";

import { useState } from "react";

interface KPIs {
  bewohnerGesamt: number;
  bewohnerAktiv: number;
  visitenQuote: number;
  visitenGesamt: number;
  therapieAktiv: number;
  therapieGesamt: number;
  beschwerdenOffen: number;
  beschwerdenLoesungsQuote: number;
  aktivitaetenQuote: number;
  aktivitaetenGesamt: number;
  hochrisikoBewohner: number;
  dekubitusVerteilung: {
    kein_risiko: number;
    maessig: number;
    hoch: number;
    sehr_hoch: number;
  };
}

interface Ziel {
  id: string;
  indikator: string;
  zielwert: number;
  einheit: string;
  beschreibung: string | null;
}

interface Props {
  initialKPIs: KPIs;
  initialZiele: Ziel[];
  zeitraum: { von: string; bis: string };
}

function kpiColor(value: number, zielwert: number, hoherIstBesser = true): string {
  const ratio = hoherIstBesser ? value / zielwert : zielwert / (value === 0 ? 0.001 : value);
  if (ratio >= 0.9) return "text-green-600";
  if (ratio >= 0.8) return "text-yellow-600";
  return "text-red-600";
}

function kpiDotColor(value: number, zielwert: number, hoherIstBesser = true): string {
  const ratio = hoherIstBesser ? value / zielwert : zielwert / (value === 0 ? 0.001 : value);
  if (ratio >= 0.9) return "bg-green-500";
  if (ratio >= 0.8) return "bg-yellow-500";
  return "bg-red-500";
}

function kpiBg(value: number, zielwert: number, hoherIstBesser = true): string {
  const ratio = hoherIstBesser ? value / zielwert : zielwert / (value === 0 ? 0.001 : value);
  if (ratio >= 0.9) return "border-green-200 bg-green-50";
  if (ratio >= 0.8) return "border-yellow-200 bg-yellow-50";
  return "border-red-200 bg-red-50";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString("de-DE");
}

function getKpiValue(indikator: string, kpis: KPIs): number | null {
  switch (indikator) {
    case "visite_quote":
      return kpis.visitenQuote;
    case "beschwerde_loesungsquote":
      return kpis.beschwerdenLoesungsQuote;
    case "aktivitaeten_quote":
      return kpis.aktivitaetenQuote;
    default:
      return null;
  }
}

export default function QSDashboardClient({ initialKPIs, initialZiele, zeitraum }: Props) {
  const [kpis, setKpis] = useState<KPIs>(initialKPIs);
  const [ziele] = useState<Ziel[]>(initialZiele);
  const [loading, setLoading] = useState(false);
  const [currentZeitraum, setCurrentZeitraum] = useState(zeitraum);

  async function handleRefresh() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/qualitaet/kpis?von=${currentZeitraum.von}&bis=${currentZeitraum.bis}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.kpis) setKpis(data.kpis);
      }
    } finally {
      setLoading(false);
    }
  }

  const dekTotal =
    kpis.dekubitusVerteilung.kein_risiko +
    kpis.dekubitusVerteilung.maessig +
    kpis.dekubitusVerteilung.hoch +
    kpis.dekubitusVerteilung.sehr_hoch;

  function dekPct(count: number): number {
    if (dekTotal === 0) return 0;
    return Math.round((count / dekTotal) * 100);
  }

  const dekBars = [
    {
      key: "kein_risiko",
      label: "Kein Risiko",
      count: kpis.dekubitusVerteilung.kein_risiko,
      barColor: "bg-green-500",
      textColor: "text-green-700",
      bgColor: "bg-green-50",
    },
    {
      key: "maessig",
      label: "Mäßiges Risiko",
      count: kpis.dekubitusVerteilung.maessig,
      barColor: "bg-yellow-400",
      textColor: "text-yellow-700",
      bgColor: "bg-yellow-50",
    },
    {
      key: "hoch",
      label: "Hohes Risiko",
      count: kpis.dekubitusVerteilung.hoch,
      barColor: "bg-orange-500",
      textColor: "text-orange-700",
      bgColor: "bg-orange-50",
    },
    {
      key: "sehr_hoch",
      label: "Sehr hohes Risiko",
      count: kpis.dekubitusVerteilung.sehr_hoch,
      barColor: "bg-red-500",
      textColor: "text-red-700",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Qualitätssicherungs-Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Zeitraum: {formatDate(currentZeitraum.von)} – {formatDate(currentZeitraum.bis)}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <svg
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {loading ? "Aktualisieren …" : "Aktualisieren"}
        </button>
      </div>

      {/* Section 1 — Bewohner-Übersicht */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Bewohner-Übersicht
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bewohner gesamt</p>
            <p className="mt-2 text-4xl font-bold text-gray-900">{kpis.bewohnerGesamt}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Aktive Bewohner</p>
            <p className="mt-2 text-4xl font-bold text-gray-900">{kpis.bewohnerAktiv}</p>
            {kpis.bewohnerGesamt > 0 && (
              <p className="mt-1 text-sm text-gray-500">
                {Math.round((kpis.bewohnerAktiv / kpis.bewohnerGesamt) * 100)} % aktiv
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Section 2 — Pflegequalität KPIs */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Pflegequalität KPIs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Visite-Durchführungsquote */}
          <div className={`rounded-xl border p-5 ${kpiBg(kpis.visitenQuote, 90)}`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Visite-Durchführungsquote
            </p>
            <p className={`mt-2 text-4xl font-bold ${kpiColor(kpis.visitenQuote, 90)}`}>
              {kpis.visitenQuote}%
            </p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-gray-500">Ziel: 90 %</p>
              <p className="text-xs text-gray-500">{kpis.visitenGesamt} Visiten</p>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
              <div
                className={`h-1.5 rounded-full ${kpis.visitenQuote >= 90 ? "bg-green-500" : kpis.visitenQuote >= 72 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${Math.min(kpis.visitenQuote, 100)}%` }}
              />
            </div>
          </div>

          {/* 2. Aktive Therapiepläne */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Aktive Therapiepläne
            </p>
            <p className="mt-2 text-4xl font-bold text-gray-900">
              {kpis.therapieAktiv}
              <span className="text-xl text-gray-400 font-normal"> / {kpis.therapieGesamt}</span>
            </p>
            {kpis.therapieGesamt > 0 && (
              <>
                <div className="mt-3 h-1.5 w-full rounded-full bg-gray-200">
                  <div
                    className="h-1.5 rounded-full bg-blue-500"
                    style={{ width: `${Math.round((kpis.therapieAktiv / kpis.therapieGesamt) * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {Math.round((kpis.therapieAktiv / kpis.therapieGesamt) * 100)} % aktiv
                </p>
              </>
            )}
          </div>

          {/* 3. Beschwerden offen */}
          <div className={`rounded-xl border p-5 ${kpis.beschwerdenOffen === 0 ? "border-green-200 bg-green-50" : kpis.beschwerdenOffen <= 2 ? "border-yellow-200 bg-yellow-50" : "border-red-200 bg-red-50"}`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Beschwerden offen
            </p>
            <p className={`mt-2 text-4xl font-bold ${kpis.beschwerdenOffen === 0 ? "text-green-600" : kpis.beschwerdenOffen <= 2 ? "text-yellow-600" : "text-red-600"}`}>
              {kpis.beschwerdenOffen}
            </p>
            <p className="mt-2 text-xs text-gray-500">Ziel: 0 offene Beschwerden</p>
          </div>

          {/* 4. Beschwerde-Lösungsquote */}
          <div className={`rounded-xl border p-5 ${kpiBg(kpis.beschwerdenLoesungsQuote, 95)}`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Beschwerde-Lösungsquote
            </p>
            <p className={`mt-2 text-4xl font-bold ${kpiColor(kpis.beschwerdenLoesungsQuote, 95)}`}>
              {kpis.beschwerdenLoesungsQuote}%
            </p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
              <div
                className={`h-1.5 rounded-full ${kpis.beschwerdenLoesungsQuote >= 95 ? "bg-green-500" : kpis.beschwerdenLoesungsQuote >= 76 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${Math.min(kpis.beschwerdenLoesungsQuote, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Ziel: 95 %</p>
          </div>

          {/* 5. Aktivitäten-Teilnahmequote */}
          <div className={`rounded-xl border p-5 ${kpiBg(kpis.aktivitaetenQuote, 70)}`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Aktivitäten-Teilnahmequote
            </p>
            <p className={`mt-2 text-4xl font-bold ${kpiColor(kpis.aktivitaetenQuote, 70)}`}>
              {kpis.aktivitaetenQuote}%
            </p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
              <div
                className={`h-1.5 rounded-full ${kpis.aktivitaetenQuote >= 70 ? "bg-green-500" : kpis.aktivitaetenQuote >= 56 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${Math.min(kpis.aktivitaetenQuote, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Ziel: 70 % · {kpis.aktivitaetenGesamt} Aktivitäten
            </p>
          </div>

          {/* 6. Hochrisiko-Bewohner Dekubitus */}
          <div className={`rounded-xl border p-5 ${kpis.hochrisikoBewohner === 0 ? "border-green-200 bg-green-50" : kpis.hochrisikoBewohner <= 2 ? "border-yellow-200 bg-yellow-50" : "border-red-200 bg-red-50"}`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Hochrisiko-Bewohner (Dekubitus)
            </p>
            <p className={`mt-2 text-4xl font-bold ${kpis.hochrisikoBewohner === 0 ? "text-green-600" : kpis.hochrisikoBewohner <= 2 ? "text-yellow-600" : "text-red-600"}`}>
              {kpis.hochrisikoBewohner}
            </p>
            <p className="mt-2 text-xs text-gray-500">Risikostufe: hoch / sehr hoch</p>
          </div>
        </div>
      </section>

      {/* Section 3 — Dekubitus-Risikoverteilung */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Dekubitus-Risikoverteilung
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          {dekTotal === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Keine Daten vorhanden.</p>
          ) : (
            <>
              {dekBars.map((bar) => (
                <div key={bar.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-medium ${bar.textColor}`}>{bar.label}</span>
                    <span className="text-gray-600 tabular-nums">
                      {bar.count} Bewohner
                      <span className="ml-2 text-gray-400">({dekPct(bar.count)} %)</span>
                    </span>
                  </div>
                  <div className="h-5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-5 rounded-full transition-all duration-500 ${bar.barColor}`}
                      style={{ width: `${dekPct(bar.count)}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                <span>Gesamt</span>
                <span className="font-medium text-gray-700">{dekTotal} Bewohner</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Section 4 — Qualitätsziele */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Qualitätsziele
        </h2>
        {ziele.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
            <svg
              className="mx-auto h-10 w-10 text-gray-300 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
            <p className="text-gray-500 font-medium">Keine Qualitätsziele definiert</p>
            <p className="text-sm text-gray-400 mt-1">
              Legen Sie Qualitätsziele an, um den Fortschritt zu verfolgen.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Indikator
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Zielwert
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Aktueller Wert
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Beschreibung
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ziele.map((z) => {
                  const actual = getKpiValue(z.indikator, kpis);
                  const dotColor =
                    actual !== null
                      ? kpiDotColor(actual, z.zielwert, z.indikator !== "beschwerden_offen")
                      : "bg-gray-300";
                  return (
                    <tr key={z.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 text-sm font-medium text-gray-900">
                        {z.indikator
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700 text-right tabular-nums">
                        {z.zielwert} {z.einheit}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-right tabular-nums">
                        {actual !== null ? (
                          <span className={kpiColor(actual, z.zielwert, z.indikator !== "beschwerden_offen")}>
                            {actual} {z.einheit}
                          </span>
                        ) : (
                          <span className="text-gray-400">–</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center">
                          <span className={`inline-block h-3 w-3 rounded-full ${dotColor}`} />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">
                        {z.beschreibung ?? "–"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

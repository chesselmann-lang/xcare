import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata = {
  title: "Telemonitoring | xcare",
};

const GERAET_LABELS: Record<string, string> = {
  blutdruckmessgeraet: "Blutdruck",
  blutzuckermessgeraet: "Blutzucker",
  waage: "Gewicht",
  pulsoximeter: "Pulsoximeter",
  ekg: "EKG",
  schlaftracker: "Schlaf",
  aktivitaetstracker: "Aktivität",
};

const GERAET_ICONS: Record<string, string> = {
  blutdruckmessgeraet: "❤️",
  blutzuckermessgeraet: "🩸",
  waage: "⚖️",
  pulsoximeter: "💨",
  ekg: "📈",
  schlaftracker: "😴",
  aktivitaetstracker: "🏃",
};

export default async function TelemonitoringPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: alle } = await supabase
    .from("telemonitoring_daten")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .order("gemessen_am", { ascending: false })
    .limit(100);

  // Group by device type
  const grouped: Record<string, typeof alle> = {};
  for (const row of alle ?? []) {
    if (!grouped[row.geraet_typ]) grouped[row.geraet_typ] = [];
    grouped[row.geraet_typ]!.push(row);
  }

  const recent = (alle ?? []).slice(0, 20);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Telemonitoring</h1>
        <p className="text-gray-500 mt-1">
          Gerätedaten importieren und verwalten — CSV, FHIR Bundle oder Bluetooth-Geräte.
        </p>
      </div>

      {/* Device Summary Cards */}
      {Object.keys(grouped).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {Object.entries(grouped).map(([typ, rows]) => {
            const latest = rows![0];
            return (
              <div key={typ} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{GERAET_ICONS[typ] ?? "📊"}</span>
                  <span className="text-sm font-medium text-gray-700">
                    {GERAET_LABELS[typ] ?? typ}
                  </span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {latest?.wert !== null && latest?.wert !== undefined
                    ? `${latest.wert} ${latest.einheit ?? ""}`
                    : "—"}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {latest?.gemessen_am
                    ? new Date(latest.gemessen_am).toLocaleDateString("de-DE")
                    : ""}
                  {" · "}
                  {rows!.length} Messung{rows!.length !== 1 ? "en" : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Import Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Daten importieren</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {/* CSV Import */}
          <div className="border border-dashed border-gray-300 rounded-xl p-5 hover:border-blue-400 transition-colors">
            <div className="text-2xl mb-2">📄</div>
            <h3 className="font-medium text-gray-800 mb-1">CSV-Datei importieren</h3>
            <p className="text-xs text-gray-500 mb-3">
              Spalten: <code className="bg-gray-100 px-1 rounded">datum, wert, einheit, geraet_typ</code>
            </p>
            <form action="/api/telemonitoring/import" method="POST" encType="multipart/form-data">
              <input
                type="file"
                name="file"
                accept=".csv,text/csv"
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <button
                type="submit"
                className="mt-3 w-full bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                CSV importieren
              </button>
            </form>
          </div>

          {/* FHIR Bundle Import */}
          <div className="border border-dashed border-gray-300 rounded-xl p-5 hover:border-purple-400 transition-colors">
            <div className="text-2xl mb-2">🔬</div>
            <h3 className="font-medium text-gray-800 mb-1">FHIR Bundle importieren</h3>
            <p className="text-xs text-gray-500 mb-3">
              HL7 FHIR R4 Bundle mit Observation-Ressourcen (JSON)
            </p>
            <form action="/api/telemonitoring/import" method="POST" encType="multipart/form-data">
              <input
                type="file"
                name="file"
                accept=".json,application/json"
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              <button
                type="submit"
                className="mt-3 w-full bg-purple-600 text-white text-sm py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                FHIR Bundle importieren
              </button>
            </form>
          </div>
        </div>

        {/* Sync button */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-700">Mit Vitaldaten synchronisieren</div>
            <div className="text-xs text-gray-400">
              Telemonitoring-Daten in die Vitaldaten-Übersicht übertragen
            </div>
          </div>
          <Link
            href="/familie/gesundheit"
            className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Vitaldaten anzeigen →
          </Link>
        </div>
      </div>

      {/* Recent readings table */}
      {recent.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Letzte Messungen</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Gerät", "Wert", "Einheit", "Gemessen am", "Quelle"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recent.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 flex items-center gap-2">
                      <span>{GERAET_ICONS[row.geraet_typ] ?? "📊"}</span>
                      <span>{GERAET_LABELS[row.geraet_typ] ?? row.geraet_typ}</span>
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {row.wert !== null ? row.wert : "—"}
                    </td>
                    <td className="py-3 px-4 text-gray-500">{row.einheit ?? "—"}</td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(row.gemessen_am).toLocaleString("de-DE")}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                        {row.quelle}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">📊</div>
          <p>Noch keine Messdaten importiert.</p>
          <p className="text-sm mt-1">Laden Sie eine CSV- oder FHIR-Datei hoch, um zu beginnen.</p>
        </div>
      )}
    </div>
  );
}

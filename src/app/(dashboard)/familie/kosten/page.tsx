import { createClient } from "@/lib/supabase/server";

export default async function KostenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Load recent bookings for cost analysis
  const { data: buchungen } = await supabase
    .from("buchungen")
    .select("*")
    .gte("datum", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
    .order("datum", { ascending: false });

  const total = (buchungen || []).reduce((sum, b) => sum + Number(b.gesamtbetrag || 0), 0);
  const avgPerMonth = total / 3;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Pflegekosten-Übersicht</h1>
      <p className="text-gray-500 mb-8">Letzte 90 Tage · Optimierungshinweise mit KI</p>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Gesamt (90 Tage)", value: `${total.toFixed(2)} €`, color: "blue" },
          { label: "Ø pro Monat", value: `${avgPerMonth.toFixed(2)} €`, color: "green" },
          { label: "Buchungen", value: String(buchungen?.length || 0), color: "purple" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-xl p-5`}>
            <div className="text-sm text-gray-500">{label}</div>
            <div className={`text-2xl font-bold text-${color}-700 mt-1`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Optimization tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-amber-800 mb-3">💡 KI-Optimierungshinweise</h2>
        <ul className="space-y-2 text-sm text-amber-700">
          <li>✓ Pflegegeld §37 SGB XI: Bis zu 571 €/Monat bei Pflegegrad 2 — Antrag lohnt sich</li>
          <li>✓ Verhinderungspflege §39 SGB XI: Bis zu 1.612 €/Jahr für Vertretungskräfte</li>
          <li>✓ Entlastungsbetrag §45b SGB XI: 125 €/Monat für haushaltsnahe Dienstleistungen</li>
          <li>✓ Steuerlich absetzbar: Pflegekosten als außergewöhnliche Belastung (§33 EStG)</li>
        </ul>
      </div>

      {/* Bookings table */}
      {buchungen && buchungen.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Datum", "Leistung", "Stunden", "Betrag"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {buchungen.slice(0, 20).map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{new Date(b.datum).toLocaleDateString("de-DE")}</td>
                  <td className="px-4 py-3 capitalize">{b.leistungsart?.replace("_", " ")}</td>
                  <td className="px-4 py-3">{Number(b.stunden || 0).toFixed(1)} h</td>
                  <td className="px-4 py-3 font-semibold">{Number(b.gesamtbetrag || 0).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

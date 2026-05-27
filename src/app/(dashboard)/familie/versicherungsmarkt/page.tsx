export const metadata = {
  title: "Pflegeversicherungs-Markt | xcare",
};

export default function VersicherungsmarktPage() {
  const tarife = [
    {
      name: "AOK Pflegepflichtversicherung",
      anbieter: "AOK",
      typ: "GKV",
      beitragssatz: "3,4%",
      leistungPG2: "316 €/Mo",
      leistungPG3: "545 €/Mo",
      besonderheiten: "Zusatztarife verfügbar",
      link: "https://www.aok.de/pk/pflegeversicherung/",
    },
    {
      name: "Pflegetagegeld Plus",
      anbieter: "Allianz",
      typ: "Private Zusatz",
      beitragssatz: "Ab 15 €/Mo",
      leistungPG2: "bis 1.500 €/Mo",
      leistungPG3: "bis 2.500 €/Mo",
      besonderheiten: "Kapitalwahlrecht, Beitragsfreistellung",
      link: "https://www.allianz.de",
    },
    {
      name: "Care-Flex-Rente",
      anbieter: "Generali",
      typ: "Private Zusatz",
      beitragssatz: "Ab 22 €/Mo",
      leistungPG2: "bis 2.000 €/Mo",
      leistungPG3: "bis 3.200 €/Mo",
      besonderheiten: "Pflegegeld + Rentenleistung kombiniert",
      link: "https://www.generali.de",
    },
    {
      name: "Pflegebahr (staatlich gefördert)",
      anbieter: "Diverse",
      typ: "Staatlich gefördert",
      beitragssatz: "10 €/Mo",
      leistungPG2: "600 €/Mo garantiert",
      leistungPG3: "600 €/Mo garantiert",
      besonderheiten: "5 € staatliche Förderung, keine Gesundheitsprüfung",
      link: "https://www.bundesfinanzministerium.de",
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Pflegeversicherungs-Markt</h1>
      <p className="text-gray-500 mb-2">
        Vergleichen Sie GKV-Leistungen und private Zusatzversicherungen.
      </p>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
        ⚠️ Dies ist eine allgemeine Übersicht. Individuelle Beratung erhalten Sie bei einem
        unabhängigen Versicherungsberater.
      </div>
      <div className="space-y-4">
        {tarife.map((t) => (
          <div key={t.name} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.typ === "GKV"
                        ? "bg-blue-100 text-blue-700"
                        : t.typ === "Staatlich gefördert"
                        ? "bg-green-100 text-green-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {t.typ}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  {t.anbieter} · {t.besonderheiten}
                </p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Beitrag</div>
                    <div className="font-semibold">{t.beitragssatz}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Bei PG 2</div>
                    <div className="font-semibold text-green-700">{t.leistungPG2}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Bei PG 3</div>
                    <div className="font-semibold text-green-700">{t.leistungPG3}</div>
                  </div>
                </div>
              </div>
              <a
                href={t.link}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                Mehr erfahren ↗
              </a>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 bg-gray-50 rounded-xl p-6">
        <h2 className="font-semibold mb-4">Leistungsansprüche nach Pflegegrad (GKV 2026)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {["", "PG 1", "PG 2", "PG 3", "PG 4", "PG 5"].map((h) => (
                  <th key={h} className="py-2 px-3 text-left text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ["Pflegegeld §37", "—", "316 €", "545 €", "728 €", "901 €"],
                ["Pflegesachleistung §36", "—", "761 €", "1.432 €", "1.778 €", "2.200 €"],
                ["Entlastungsbetrag §45b", "125 €", "125 €", "125 €", "125 €", "125 €"],
                ["Verhinderungspflege §39", "—", "1.612 €", "1.612 €", "1.612 €", "1.612 €"],
              ].map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) => (
                    <td
                      key={i}
                      className={`py-2 px-3 ${i === 0 ? "font-medium" : "text-green-700"}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

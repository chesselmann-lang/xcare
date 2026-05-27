export default function ForschungPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
        <h1 className="text-3xl font-bold mb-3">xcare Research Platform</h1>
        <p className="text-indigo-100 text-lg">
          Helfen Sie der Pflegeforschung — anonym und sicher.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { n: "2.847", label: "Teilnehmende Familien" },
          { n: "14", label: "Aktive Forschungsprojekte" },
          { n: "3", label: "Universitäts-Partner" },
        ].map(({ n, label }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-indigo-600">{n}</div>
            <div className="text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Aktuelle Studien</h2>
        {[
          {
            title: "Pflegegrad-Prognose mit KI",
            institution: "Charité Berlin",
            n: "500 Teilnehmer gesucht",
            vergütung: "20 € Amazon-Gutschein",
          },
          {
            title: "Auswirkungen digitaler Pflegetools",
            institution: "Universität Hamburg",
            n: "1.000 Teilnehmer gesucht",
            vergütung: "Kostenloser Premium-Zugang",
          },
          {
            title: "Pflegender-Belastungsstudie 2026",
            institution: "TU München",
            n: "unbegrenzt",
            vergütung: "Individueller Auswertungsbericht",
          },
        ].map((study) => (
          <div key={study.title} className="border-b border-gray-100 last:border-0 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold">{study.title}</div>
                <div className="text-sm text-gray-500">{study.institution} · {study.n}</div>
                <div className="text-sm text-green-600 mt-1">🎁 {study.vergütung}</div>
              </div>
              <button className="shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors">
                Teilnehmen
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-semibold mb-2">🔒 Datenschutz-Garantien</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>✓ Vollständige Anonymisierung vor jeder Weitergabe</li>
          <li>✓ Einwilligung jederzeit widerrufbar</li>
          <li>✓ Keine Weitergabe an Versicherungen oder Arbeitgeber</li>
          <li>✓ Daten verlassen Deutschland nicht (DSGVO Art. 44 ff.)</li>
          <li>✓ Technisch: k-Anonymität (k≥5) + Differential Privacy</li>
        </ul>
      </div>
    </div>
  );
}

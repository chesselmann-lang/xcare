export default function WohlbefindenPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Mein Wohlbefinden</h1>
      <p className="text-gray-500 mb-8">Pflegende Angehörige sind oft überlastet. Hier finden Sie Unterstützung.</p>

      {/* Burn-out risk indicator */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-green-800">Ihr aktuelles Belastungsniveau</h2>
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">Moderat</span>
        </div>
        <div className="w-full bg-green-200 rounded-full h-3 mb-2">
          <div className="bg-green-600 h-3 rounded-full" style={{ width: "45%" }} />
        </div>
        <p className="text-sm text-green-700">45% — Im normalen Bereich. Denken Sie an regelmäßige Pausen.</p>
      </div>

      {/* Ressourcen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[
          { icon: "🧘", title: "5-Minuten-Atemübung", desc: "Schnelle Entspannung für zwischendurch", href: "#" },
          { icon: "💬", title: "Selbsthilfegruppen", desc: "Angehörige in Ihrer Region", href: "#" },
          { icon: "📞", title: "Pflegetelefon", desc: "Kostenlos: 030 20 17 91 31", href: "tel:03020179131" },
          { icon: "🏖️", title: "Auszeiten planen", desc: "Verhinderungspflege beantragen", href: "/familie/antraege/neu" },
        ].map(({ icon, title, desc, href }) => (
          <a key={title} href={href} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all group">
            <div className="text-3xl mb-2">{icon}</div>
            <div className="font-semibold group-hover:text-blue-700">{title}</div>
            <div className="text-sm text-gray-500 mt-1">{desc}</div>
          </a>
        ))}
      </div>

      {/* Daily check-in */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
        <h2 className="font-semibold text-purple-800 mb-4">Wie fühlen Sie sich heute?</h2>
        <div className="flex gap-3 justify-center text-4xl">
          {["😫", "😔", "😐", "🙂", "😊"].map((emoji, i) => (
            <button key={i} className="hover:scale-125 transition-transform p-2 rounded-xl hover:bg-purple-100" title={["Erschöpft", "Müde", "Ok", "Gut", "Super"][i]}>
              {emoji}
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-purple-600 mt-3">Tipp: Schreiben Sie Ihre Gedanken ins Pflegetagebuch</p>
      </div>
    </div>
  );
}

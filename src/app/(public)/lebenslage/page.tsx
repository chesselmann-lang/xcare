import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lebenslagen – Pflegeangebote nach Thema | xcare",
  description:
    "Finden Sie passende Pflegedienste und Unterstützungsangebote für Ihre Lebenssituation – von Geburt & Kindheit bis Alter & Pflege.",
};

const KATEGORIEN = [
  {
    slug: "geburt-fruehe-kindheit",
    label: "Geburt & frühe Kindheit",
    description: "Hebammen, Kitas, Frühförderung",
    icon: "👶",
    color: "from-pink-50 to-rose-50 border-pink-100 hover:border-pink-200",
  },
  {
    slug: "schulkind-jugend",
    label: "Schulkind & Jugend",
    description: "Nachhilfe, Hort, Jugendarbeit",
    icon: "🎒",
    color: "from-orange-50 to-amber-50 border-orange-100 hover:border-orange-200",
  },
  {
    slug: "eingliederung-behinderung",
    label: "Eingliederung & Behinderung",
    description: "Assistenz, Inklusion, Teilhabe",
    icon: "♿",
    color: "from-blue-50 to-sky-50 border-blue-100 hover:border-blue-200",
  },
  {
    slug: "erwerbsleben-vereinbarkeit",
    label: "Erwerbsleben & Vereinbarkeit",
    description: "Kinderbetreuung, Work-Life-Balance",
    icon: "💼",
    color: "from-violet-50 to-purple-50 border-violet-100 hover:border-violet-200",
  },
  {
    slug: "krankheit-genesung",
    label: "Krankheit & Genesung",
    description: "Reha, Pflege, Haushaltshilfe",
    icon: "🏥",
    color: "from-cyan-50 to-teal-50 border-cyan-100 hover:border-cyan-200",
  },
  {
    slug: "alter-pflege",
    label: "Alter & Pflege",
    description: "Pflegedienste, Seniorenbetreuung",
    icon: "🏡",
    color: "from-green-50 to-emerald-50 border-green-100 hover:border-green-200",
  },
  {
    slug: "hospiz-palliativ",
    label: "Hospiz & Palliativ",
    description: "Würdevolle Begleitung am Lebensende",
    icon: "🕊️",
    color: "from-slate-50 to-gray-50 border-slate-100 hover:border-slate-200",
  },
  {
    slug: "trauer-nachlass",
    label: "Trauer & Nachlass",
    description: "Trauerbegleitung, Nachlass-Unterstützung",
    icon: "🌹",
    color: "from-rose-50 to-pink-50 border-rose-100 hover:border-rose-200",
  },
];

export default function LebenslagenIndexPage() {
  return (
    <div className="min-h-screen bg-[--background]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[--primary] to-[--primary-dark] text-white py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Unterstützung für jede Lebenslage
          </h1>
          <p className="text-lg opacity-90 mb-6 max-w-xl mx-auto">
            Finden Sie qualifizierte Pflegedienstleister und Unterstützungsangebote
            passend zu Ihrer aktuellen Situation.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link href="/suche">
              <Button className="bg-white text-[--primary] hover:bg-gray-50 gap-2">
                <Search className="h-4 w-4" />
                Alle Anbieter suchen
              </Button>
            </Link>
            <Link href="/lotse">
              <Button variant="outline" className="border-white text-white hover:bg-white/10 gap-2">
                KI-Beratung starten
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Categories grid */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-2 text-center">Unsere Kategorien</h2>
        <p className="text-[--muted-foreground] text-center mb-8">
          Wählen Sie Ihre Lebenssituation – wir zeigen Ihnen passende Anbieter.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KATEGORIEN.map((cat) => (
            <Link key={cat.slug} href={`/lebenslage/${cat.slug}`} className="group">
              <div className={`bg-gradient-to-br ${cat.color} border rounded-2xl p-6 h-full flex flex-col transition-all hover:shadow-md`}>
                <span className="text-4xl mb-3">{cat.icon}</span>
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-[--primary] transition-colors">
                  {cat.label}
                </h3>
                <p className="text-xs text-gray-500 flex-1 leading-relaxed mb-3">
                  {cat.description}
                </p>
                <span className="text-xs text-[--primary] font-medium flex items-center gap-1">
                  Anbieter finden <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 bg-[--primary-light] rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold mb-2">Unsicher, was Sie brauchen?</h3>
          <p className="text-[--muted-foreground] mb-4">
            Unser KI-Lotse hilft Ihnen, die passende Unterstützung für Ihre Situation zu finden.
          </p>
          <Link href="/lotse">
            <Button className="gap-2">
              Jetzt KI-Beratung starten <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

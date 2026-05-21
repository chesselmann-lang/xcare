// ============================================
// /pflegekraefte — Öffentliche Care-Worker Suche
// PostGIS-gestützte Radius-Suche mit Qualifikations- und Sprachfiltern.
// ============================================

import { Metadata } from "next";
import { Suspense } from "react";
import { Users, Search } from "lucide-react";
import { CareWorkerSuche } from "@/components/care-workers/CareWorkerSuche";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.de";

export const metadata: Metadata = {
  title: "Pflegekräfte finden | xcare",
  description:
    "Finden Sie qualifizierte Pflegekräfte in Ihrer Nähe — mit Radius-Suche, Qualifikationsfilter und Führungszeugnis-Verifikation.",
  alternates: { canonical: `${APP_URL}/pflegekraefte` },
  openGraph: {
    title: "Pflegekräfte finden | xcare",
    description: "Qualifizierte Pflegekräfte in Ihrer Nähe — direkt anfragen.",
    url: `${APP_URL}/pflegekraefte`,
    type: "website",
  },
};

export default function PflegekraeftePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Pflegekräfte finden
            </h1>
          </div>
          <p className="text-gray-600 max-w-xl">
            Suchen Sie qualifizierte Pflegekräfte in Ihrer Nähe — mit Radius-Filter,
            Qualifikation, Sprachen und Führungszeugnis-Nachweis.
          </p>
        </div>
      </div>

      {/* Suche */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Suspense fallback={
          <div className="flex items-center gap-2 text-gray-500 py-12">
            <Search className="w-5 h-5 animate-pulse" />
            Lade Suche...
          </div>
        }>
          <CareWorkerSuche />
        </Suspense>
      </div>
    </div>
  );
}

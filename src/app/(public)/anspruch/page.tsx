import type { Metadata } from "next";
import { AnspruchsRechner } from "@/components/anspruch/AnspruchsRechner";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://xcare.de";

export const metadata: Metadata = {
  title: "Anspruchs-Rechner | xcare",
  description:
    "Berechnen Sie Ihre Leistungsansprüche nach SGB XI, SGB XII, SGB VIII, SGB IX und § 35a EStG – deterministisch, ohne KI-Urteil, kostenlos.",
  robots: { index: true, follow: true },
  alternates: { canonical: `${APP_URL}/anspruch` },
  openGraph: { url: `${APP_URL}/anspruch`, type: "website" },
};

export default function AnspruchPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium border border-green-200">
          🔒 Deterministisch · Kein KI-Urteil · DSGVO-konform
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Anspruchs-Rechner</h1>
        <p className="text-gray-600 max-w-lg mx-auto">
          Ermitteln Sie Ihre Ansprüche auf Pflegegeld, Sachleistungen, Haushaltshilfe,
          Grundsicherung, Eingliederungshilfe und steuerliche Erleichterungen — nach geltendem
          deutschen Recht (Stand 2025).
        </p>
      </div>

      <div className="grid gap-4 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="font-medium text-blue-900">Was dieser Rechner macht:</p>
        <ul className="space-y-1 text-blue-800">
          <li className="flex items-center gap-2">
            <span>✓</span> Pflegeversicherungsleistungen nach <strong>SGB XI</strong> (Pflegegeld, Sachleistungen, Entlastungsbetrag)
          </li>
          <li className="flex items-center gap-2">
            <span>✓</span> Sozialhilfe und Grundsicherung nach <strong>SGB XII</strong>
          </li>
          <li className="flex items-center gap-2">
            <span>✓</span> Steuerermäßigung nach <strong>§ 35a EStG</strong> (bis 4.000 €/Jahr)
          </li>
          <li className="flex items-center gap-2">
            <span>✓</span> Kinder- und Jugendhilfe nach <strong>SGB VIII</strong>
          </li>
          <li className="flex items-center gap-2">
            <span>✓</span> Eingliederungshilfe nach <strong>SGB IX</strong>
          </li>
        </ul>
      </div>

      <AnspruchsRechner lebenslage="alter_pflege" />
    </main>
  );
}

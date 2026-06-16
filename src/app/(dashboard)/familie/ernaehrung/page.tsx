// app/(dashboard)/familie/ernaehrung/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ernährung & Flüssigkeit | xcare',
  description: 'Ernährungsplan, Flüssigkeitsbilanz und Mahlzeiten-Protokoll',
};

export default function ErnaehrungPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🥗 Ernährung &amp; Flüssigkeit</h1>
        <p className="text-gray-500 mt-1">
          Diese Funktion steht im Bewohner-Kontext der Pflegeeinrichtung zur Verfügung.
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
        <p>Bitte wählen Sie einen Bewohner aus dem Bewohner-Bereich der Pflegeeinrichtung.</p>
      </div>
    </div>
  );
}

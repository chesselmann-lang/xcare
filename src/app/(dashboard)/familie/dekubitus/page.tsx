// app/(dashboard)/familie/dekubitus/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dekubitusprophylaxe | xcare',
  description: 'Braden-Skala Assessment und Lagerungsplan',
};

export default function DekubitusPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🛡️ Dekubitusprophylaxe</h1>
        <p className="mt-1 text-sm text-gray-500">
          Braden-Skala zur Risikoeinschätzung und Lagerungsprotokoll
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
        <p>Diese Funktion steht im Bewohner-Kontext der Pflegeeinrichtung zur Verfügung.</p>
      </div>
    </div>
  );
}

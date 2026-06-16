import { Scale } from "lucide-react";

export const metadata = { title: "Gewicht & Vitalwerte" };

export default function FamilieGewichtPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-blue-100 mb-4">
        <Scale className="h-7 w-7 text-blue-600" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Gewicht & Vitalwerte</h1>
      <p className="text-gray-500 text-sm">
        Der Gewichts- und Vitalwertverlauf steht im Bewohner-Kontext der Pflegeeinrichtung zur
        Verfügung.
      </p>
    </div>
  );
}

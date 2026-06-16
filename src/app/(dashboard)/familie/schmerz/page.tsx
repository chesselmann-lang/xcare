import { Activity } from "lucide-react";

export const metadata = { title: "Schmerzprotokoll" };

export default function FamilieSchmerzPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-orange-100 mb-4">
        <Activity className="h-7 w-7 text-orange-600" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Schmerzprotokoll</h1>
      <p className="text-gray-500 text-sm">
        Das Schmerzprotokoll steht im Bewohner-Kontext der Pflegeeinrichtung zur Verfuegung.
      </p>
    </div>
  );
}

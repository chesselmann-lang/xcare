import { AlertTriangle } from "lucide-react";

export const metadata = { title: "Sturzprotokoll" };

export default function FamilieSturzprotokollPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-orange-100 mb-4">
        <AlertTriangle className="h-7 w-7 text-orange-600" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Sturzprotokoll</h1>
      <p className="text-gray-500 text-sm">
        Das Sturzprotokoll steht im Bewohner-Kontext der Pflegeeinrichtung zur Verfügung.
      </p>
    </div>
  );
}

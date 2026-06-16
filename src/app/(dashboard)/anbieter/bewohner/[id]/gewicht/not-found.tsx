import { FileX2 } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-gray-100 mb-4">
        <FileX2 className="h-7 w-7 text-gray-500" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Nicht gefunden</h1>
      <p className="text-gray-500 text-sm mb-6">
        Der Bewohner oder die Ressource wurde nicht gefunden oder du hast keinen Zugriff.
      </p>
      <Link
        href="/anbieter/bewohner"
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Zur Bewohnerliste
      </Link>
    </div>
  );
}

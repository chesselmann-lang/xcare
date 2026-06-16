"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { logger } from "@/lib/logger";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    logger.error("Bewohner-Route Fehler", { digest: error.digest ?? "unknown" });
  }, [error]);

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-4">
        <AlertTriangle className="h-7 w-7 text-red-600" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Fehler beim Laden</h1>
      <p className="text-gray-500 text-sm mb-6">
        Die Seite konnte nicht geladen werden. Bitte versuche es erneut.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Erneut versuchen
      </button>
    </div>
  );
}

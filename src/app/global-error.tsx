"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to browser console in dev; in production Vercel captures this automatically
    console.error("[GlobalError]", error.message, error.digest ?? "");
  }, [error]);

  return (
    <html lang="de">
      <body className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 border border-red-100">
              <span className="text-4xl" role="img" aria-label="Fehler">⚠️</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Unerwarteter Fehler
          </h1>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Etwas ist schiefgelaufen. Unser Team wurde benachrichtigt.
            Bitte versuche es erneut oder lade die Seite neu.
          </p>

          {/* Error digest for support reference */}
          {error.digest && (
            <p className="text-xs text-gray-400 mb-6 font-mono bg-gray-50 rounded-lg px-3 py-2 inline-block">
              Fehler-ID: {error.digest}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Seite neu laden
            </Button>
            <Button onClick={reset}>
              Erneut versuchen
            </Button>
          </div>

          {/* Support link */}
          <p className="mt-8 text-xs text-gray-400">
            Problem hält an?{" "}
            <a
              href="mailto:support@xcare.de"
              className="text-blue-600 hover:underline"
            >
              support@xcare.de
            </a>
          </p>
        </div>

        {/* Home link outside card */}
        <a
          href="/"
          className="mt-6 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Zurück zur Startseite
        </a>
      </body>
    </html>
  );
}

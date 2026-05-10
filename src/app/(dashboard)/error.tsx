"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError]", error.message, error.digest ?? "");
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      {/* Icon */}
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 border border-amber-100">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
      </div>

      {/* Text */}
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Etwas ist schiefgelaufen
      </h2>
      <p className="text-gray-500 text-sm mb-2 max-w-sm leading-relaxed">
        Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut
        oder kehre zur Übersicht zurück.
      </p>

      {/* Error digest */}
      {error.digest && (
        <p className="text-xs text-gray-400 mb-5 font-mono bg-gray-50 rounded px-2 py-1 inline-block">
          ID: {error.digest}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Erneut versuchen
        </Button>
        <Button variant="outline" asChild>
          <Link href="/" className="gap-2 flex items-center">
            <Home className="h-4 w-4" />
            Zur Startseite
          </Link>
        </Button>
      </div>

      {/* Support */}
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
  );
}

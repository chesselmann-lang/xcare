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
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="de">
      <body className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center font-sans">
        <div className="max-w-md">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <span className="text-4xl">⚠️</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Unerwarteter Fehler</h1>
          <p className="text-muted-foreground mb-6">
            Etwas ist schiefgelaufen. Bitte versuche es erneut oder lade die
            Seite neu.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground mb-4 font-mono">
              Fehler-ID: {error.digest}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Seite neu laden
            </Button>
            <Button onClick={reset}>Erneut versuchen</Button>
          </div>
        </div>
      </body>
    </html>
  );
}

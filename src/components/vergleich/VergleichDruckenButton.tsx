"use client";

import { Printer } from "lucide-react";

/**
 * VergleichDruckenButton — triggers window.print() which opens the
 * system print dialog. Users can choose "Als PDF speichern" from there.
 */
export function VergleichDruckenButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={[
        "inline-flex items-center gap-2 rounded-lg border border-[--border]",
        "bg-[--background] px-4 py-2 text-sm font-medium text-[--foreground]",
        "hover:bg-[--muted]/40 transition-colors print:hidden",
      ].join(" ")}
    >
      <Printer className="h-4 w-4" aria-hidden />
      Drucken / PDF speichern
    </button>
  );
}

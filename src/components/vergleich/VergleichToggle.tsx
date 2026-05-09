"use client";

import { useState, useEffect } from "react";
import { GitCompareArrows, X } from "lucide-react";
import {
  addToVergleich,
  removeFromVergleich,
  isInVergleich,
  VERGLEICH_CHANGED,
} from "./VergleichStore";

interface VergleichToggleProps {
  anbieterId: string;
  anbieterName: string;
}

export function VergleichToggle({ anbieterId, anbieterName }: VergleichToggleProps) {
  const [selected, setSelected] = useState(false);
  const [full, setFull] = useState(false);

  // Sync with store
  useEffect(() => {
    const sync = () => {
      const inList = isInVergleich(anbieterId);
      setSelected(inList);
    };
    sync();
    window.addEventListener(VERGLEICH_CHANGED, sync);
    return () => window.removeEventListener(VERGLEICH_CHANGED, sync);
  }, [anbieterId]);

  function toggle() {
    if (selected) {
      removeFromVergleich(anbieterId);
      setFull(false);
    } else {
      const ok = addToVergleich({ id: anbieterId, name: anbieterName });
      if (!ok) {
        setFull(true);
        setTimeout(() => setFull(false), 2000);
      }
    }
  }

  return (
    <button
      onClick={toggle}
      title={full ? "Max. 3 Anbieter" : selected ? "Aus Vergleich entfernen" : "Zum Vergleich hinzufügen"}
      aria-label={selected ? "Aus Vergleich entfernen" : "Zum Vergleich hinzufügen"}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium transition-colors ${
        full
          ? "border-red-300 bg-red-50 text-red-600"
          : selected
          ? "border-[--primary] bg-[--primary]/10 text-[--primary]"
          : "border-[--border] bg-transparent text-[--muted-foreground] hover:border-[--primary] hover:text-[--primary]"
      }`}
    >
      {selected ? (
        <X className="h-3 w-3" />
      ) : (
        <GitCompareArrows className="h-3 w-3" />
      )}
      {full ? "Voll (max. 3)" : selected ? "Im Vergleich" : "Vergleichen"}
    </button>
  );
}

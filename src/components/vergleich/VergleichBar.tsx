"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GitCompareArrows, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getVergleichIds,
  removeFromVergleich,
  clearVergleich,
  VERGLEICH_CHANGED,
  type VergleichEntry,
} from "./VergleichStore";

export function VergleichBar() {
  const [entries, setEntries] = useState<VergleichEntry[]>([]);

  useEffect(() => {
    const sync = () => setEntries(getVergleichIds());
    sync();
    window.addEventListener(VERGLEICH_CHANGED, sync);
    return () => window.removeEventListener(VERGLEICH_CHANGED, sync);
  }, []);

  if (entries.length === 0) return null;

  const vergleichUrl = `/familie/vergleich?ids=${entries.map((e) => e.id).join(",")}`;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-max max-w-[calc(100vw-2rem)]">
      <div className="flex items-center gap-3 bg-[--foreground] text-white rounded-2xl shadow-2xl px-4 py-3 border border-white/10">
        {/* Icon + label */}
        <div className="flex items-center gap-1.5 shrink-0 text-white/80">
          <GitCompareArrows className="h-4 w-4" />
          <span className="text-xs font-medium hidden sm:inline">Vergleich</span>
        </div>

        <div className="h-4 w-px bg-white/20 shrink-0" />

        {/* Selected anbieter chips */}
        <div className="flex items-center gap-1.5">
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1 text-xs font-medium max-w-[120px]"
            >
              <span className="truncate">{e.name}</span>
              <button
                onClick={() => removeFromVergleich(e.id)}
                aria-label={`${e.name} entfernen`}
                className="shrink-0 text-white/60 hover:text-white transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {/* Placeholders for remaining slots */}
          {Array.from({ length: 3 - entries.length }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-center w-20 h-6 rounded-lg border border-dashed border-white/20 text-[10px] text-white/30"
            >
              + Anbieter
            </div>
          ))}
        </div>

        <div className="h-4 w-px bg-white/20 shrink-0" />

        {/* CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href={vergleichUrl}>
            <Button
              size="sm"
              className="h-7 text-xs bg-white text-[--foreground] hover:bg-white/90"
              disabled={entries.length < 2}
            >
              Vergleichen
            </Button>
          </Link>
          <button
            onClick={clearVergleich}
            aria-label="Vergleich leeren"
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

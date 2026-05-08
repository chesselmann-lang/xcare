"use client";

import { cn } from "@/lib/utils";
import { LEBENSLAGEN } from "@/lib/constants";
import type { LebenslageTyp } from "@/lib/types";

interface LebenslagePiklerProps {
  selected: LebenslageTyp | null;
  onSelect: (ll: LebenslageTyp) => void;
}

export function LebenslagePicker({ selected, onSelect }: LebenslagePiklerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {(Object.entries(LEBENSLAGEN) as [LebenslageTyp, (typeof LEBENSLAGEN)[LebenslageTyp]][]).map(
        ([key, ll]) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={cn(
              "group flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all",
              "hover:border-[--primary] hover:shadow-md",
              selected === key
                ? "border-[--primary] shadow-md"
                : "border-[--border]"
            )}
            style={{
              background: selected === key ? ll.farbe : undefined,
            }}
          >
            <span className="text-3xl">{ll.emoji}</span>
            <span className="text-sm font-medium leading-tight">{ll.label}</span>
            <span className="text-xs text-[--muted-foreground] leading-tight hidden sm:block">
              {ll.beschreibung}
            </span>
          </button>
        )
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { GitCompareArrows, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Anbieter {
  id: string;
  name: string;
}

interface VergleichPickerProps {
  anbieterList: Anbieter[];
}

export function VergleichPicker({ anbieterList }: VergleichPickerProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  const compareUrl = `/familie/vergleich?ids=${selected.join(",")}`;

  if (anbieterList.length < 2) return null;

  return (
    <div className="rounded-xl border border-[--border] bg-[--card] overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[--muted]/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4 text-[--primary]" />
          <span className="text-sm font-medium">Anbieter vergleichen</span>
          {selected.length > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-[--primary] text-white text-xs font-bold px-1.5">
              {selected.length}
            </span>
          )}
        </div>
        <span className="text-xs text-[--muted-foreground]">
          {open ? "Schließen ↑" : "Öffnen ↓"}
        </span>
      </button>

      {open && (
        <div className="border-t border-[--border] p-4 space-y-3">
          <p className="text-xs text-[--muted-foreground]">
            Wählen Sie 2–3 Anbieter für einen direkten Vergleich:
          </p>

          {/* Anbieter chips */}
          <div className="flex flex-wrap gap-2">
            {anbieterList.map((a) => {
              const isSelected = selected.includes(a.id);
              const isDisabled = !isSelected && selected.length >= 3;
              return (
                <button
                  key={a.id}
                  onClick={() => toggle(a.id)}
                  disabled={isDisabled}
                  className={`inline-flex items-center gap-1.5 rounded-full border text-xs font-medium px-3 py-1.5 transition-all ${
                    isSelected
                      ? "bg-[--primary] text-white border-[--primary]"
                      : isDisabled
                      ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-white text-[--foreground] border-[--border] hover:border-[--primary] hover:text-[--primary]"
                  }`}
                >
                  {isSelected && <CheckCircle2 className="h-3 w-3" />}
                  {a.name}
                </button>
              );
            })}
          </div>

          {/* CTA row */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[--muted-foreground]">
              {selected.length === 0 && "Noch nichts ausgewählt"}
              {selected.length === 1 && "Noch 1 weiteren Anbieter wählen"}
              {selected.length >= 2 && `${selected.length} Anbieter ausgewählt`}
            </span>
            <div className="flex gap-2">
              {selected.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected([])}
                  className="h-7 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Zurücksetzen
                </Button>
              )}
              <Button
                size="sm"
                disabled={selected.length < 2}
                asChild={selected.length >= 2}
                className="h-7 text-xs"
              >
                {selected.length >= 2 ? (
                  <Link href={compareUrl}>Jetzt vergleichen →</Link>
                ) : (
                  <span>Jetzt vergleichen →</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

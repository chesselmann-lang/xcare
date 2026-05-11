"use client";

import { useState } from "react";
import { useUiModus } from "./UiModusProvider";
import type { UiModus } from "@/lib/types";

const MODI: { value: UiModus; label: string; emoji: string }[] = [
  { value: "senior", label: "Senior", emoji: "👴" },
  { value: "standard", label: "Standard", emoji: "🏠" },
  { value: "profi", label: "Profi", emoji: "💼" },
  { value: "familie", label: "Familie", emoji: "👨‍👩‍👧" },
];

export function ModusWechsler() {
  const { uiModus, setUiModus } = useUiModus();
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function handleWechsel(modus: UiModus) {
    if (modus === uiModus || isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/profil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ui_modus: modus }),
      });

      if (!res.ok) throw new Error("Fehler beim Speichern");

      setUiModus(modus);
      const found = MODI.find((m) => m.value === modus);
      setToast(`${found?.emoji} ${found?.label}-Modus aktiviert`);
      setTimeout(() => setToast(null), 2500);
    } catch {
      setToast("Fehler beim Speichern des Modus");
      setTimeout(() => setToast(null), 2500);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {MODI.map((modus) => {
          const isActive = uiModus === modus.value;
          return (
            <button
              key={modus.value}
              onClick={() => handleWechsel(modus.value)}
              disabled={isLoading}
              aria-pressed={isActive}
              className={[
                "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                isActive
                  ? "border-[--primary] bg-[--primary] text-white shadow-sm"
                  : "border-[--border] bg-[--card] text-[--foreground] hover:bg-[--muted]",
              ].join(" ")}
            >
              <span>{modus.emoji}</span>
              <span>{modus.label}</span>
            </button>
          );
        })}
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg bg-[--primary]/10 px-3 py-2 text-sm text-[--primary] font-medium"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

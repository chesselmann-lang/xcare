"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { SlidersHorizontal } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "Alle" },
  { value: "offen", label: "Offen" },
  { value: "in_bearbeitung", label: "In Bearbeitung" },
  { value: "angeboten", label: "Angebot" },
  { value: "bestaetigt", label: "Bestätigt" },
  { value: "abgelehnt", label: "Abgelehnt" },
  { value: "abgeschlossen", label: "Abgeschlossen" },
];

const SORT_OPTIONS = [
  { value: "updated_desc", label: "Zuletzt aktiv" },
  { value: "created_desc", label: "Neueste zuerst" },
  { value: "created_asc", label: "Älteste zuerst" },
];

export function AnfragenFilter({ totalCount }: { totalCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") ?? "";
  const currentSort = searchParams.get("sort") ?? "updated_desc";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6 p-3 rounded-xl bg-[--muted] border border-[--border]">
      <div className="flex items-center gap-1.5 text-xs text-[--muted-foreground] shrink-0">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="font-medium">Filter</span>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-1.5 flex-1">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateParam("status", opt.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              currentStatus === opt.value
                ? "bg-[--primary] text-white shadow-sm"
                : "bg-[--background] border border-[--border] text-[--muted-foreground] hover:border-[--primary]/50 hover:text-[--foreground]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-[--muted-foreground]">Sortieren:</span>
        <select
          value={currentSort}
          onChange={(e) => updateParam("sort", e.target.value)}
          className="text-xs border border-[--border] rounded-lg px-2 py-1 bg-[--background] text-[--foreground] focus:outline-none focus:ring-1 focus:ring-[--primary]/40"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <span className="text-xs text-[--muted-foreground] shrink-0">{totalCount} Anfragen</span>
    </div>
  );
}

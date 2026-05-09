"use client";

import { useState, useTransition } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { statusAendern } from "@/app/(dashboard)/anbieter/anfragen/aktionen";
import type { AnfrageStatus } from "@/lib/types";

const ALL_STATUSES: { value: AnfrageStatus; label: string; color: string }[] = [
  { value: "offen",          label: "Offen",           color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  { value: "in_bearbeitung", label: "In Bearbeitung",  color: "text-blue-700 bg-blue-50 border-blue-200" },
  { value: "angeboten",      label: "Angebot gemacht", color: "text-purple-700 bg-purple-50 border-purple-200" },
  { value: "bestaetigt",     label: "Bestätigt",       color: "text-green-700 bg-green-50 border-green-200" },
  { value: "abgelehnt",      label: "Abgelehnt",       color: "text-red-700 bg-red-50 border-red-200" },
  { value: "abgeschlossen",  label: "Abgeschlossen",   color: "text-gray-600 bg-gray-50 border-gray-200" },
];

interface StatusWechselSelectProps {
  anfrageId: string;
  status: AnfrageStatus;
}

export function StatusWechselSelect({ anfrageId, status }: StatusWechselSelectProps) {
  const [current, setCurrent] = useState<AnfrageStatus>(status);
  const [pending, startTransition] = useTransition();

  const currentCfg = ALL_STATUSES.find((s) => s.value === current) ?? ALL_STATUSES[0];

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation();
    const next = e.target.value as AnfrageStatus;
    if (next === current) return;

    const prev = current;
    setCurrent(next); // optimistic

    startTransition(async () => {
      const result = await statusAendern(anfrageId, next);
      if (result?.error) {
        setCurrent(prev); // rollback
        toast.error("Statuswechsel fehlgeschlagen", { description: result.error });
      } else {
        const cfg = ALL_STATUSES.find((s) => s.value === next);
        toast.success(`Status: ${cfg?.label ?? next}`);
      }
    });
  }

  return (
    <div
      className="relative inline-flex items-center"
      onClick={(e) => e.stopPropagation()}
    >
      <select
        value={current}
        onChange={handleChange}
        disabled={pending}
        className={`appearance-none cursor-pointer pl-2.5 pr-7 py-1 rounded-full text-xs font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-[--primary]/30 disabled:opacity-60 ${currentCfg.color}`}
        aria-label="Status ändern"
      >
        {ALL_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
        {pending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </span>
    </div>
  );
}

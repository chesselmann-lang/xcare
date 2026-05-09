"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Verfuegbarkeit = "verfuegbar" | "eingeschraenkt" | "ausgebucht";

const OPTIONS: { value: Verfuegbarkeit; label: string; desc: string; color: string; icon: React.ElementType }[] = [
  {
    value: "verfuegbar",
    label: "Verfügbar",
    desc: "Wir nehmen aktiv neue Anfragen an.",
    color: "border-green-300 bg-green-50 text-green-700",
    icon: CheckCircle2,
  },
  {
    value: "eingeschraenkt",
    label: "Eingeschränkt",
    desc: "Begrenzte Kapazitäten – bitte anfragen.",
    color: "border-amber-300 bg-amber-50 text-amber-700",
    icon: Clock,
  },
  {
    value: "ausgebucht",
    label: "Ausgebucht",
    desc: "Derzeit keine freien Kapazitäten.",
    color: "border-red-300 bg-red-50 text-red-700",
    icon: XCircle,
  },
];

interface Props {
  anbieterId: string;
  initial: Verfuegbarkeit;
}

export function VerfuegbarkeitPicker({ anbieterId, initial }: Props) {
  const [current, setCurrent] = useState<Verfuegbarkeit>(initial);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  function handleSelect(value: Verfuegbarkeit) {
    if (value === current) return;
    startTransition(async () => {
      const { error } = await supabase
        .from("anbieter")
        .update({ verfuegbarkeit: value })
        .eq("id", anbieterId);

      if (error) {
        toast.error("Fehler beim Aktualisieren der Verfügbarkeit.");
        return;
      }
      setCurrent(value);
      toast.success("Verfügbarkeit aktualisiert.");
    });
  }

  return (
    <div className="space-y-2">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = current === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            disabled={isPending}
            className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left ${
              isActive
                ? `${opt.color} border-current`
                : "border-gray-100 bg-white hover:border-gray-200 text-gray-600"
            }`}
          >
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${isActive ? "" : "text-gray-400"}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${isActive ? "" : "text-gray-700"}`}>
                {opt.label}
              </p>
              <p className={`text-xs mt-0.5 ${isActive ? "opacity-80" : "text-gray-400"}`}>
                {opt.desc}
              </p>
            </div>
            {isActive && isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 mt-0.5" />
            )}
            {isActive && !isPending && (
              <div className="h-3.5 w-3.5 rounded-full bg-current opacity-80 shrink-0 mt-0.5" />
            )}
          </button>
        );
      })}
    </div>
  );
}

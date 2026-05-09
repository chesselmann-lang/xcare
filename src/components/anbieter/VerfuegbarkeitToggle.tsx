"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Verfuegbarkeit = "verfuegbar" | "eingeschraenkt" | "ausgebucht";

interface Props {
  anbieterId: string;
  initialVerfuegbarkeit: Verfuegbarkeit | null;
}

const OPTIONS: Array<{
  value: Verfuegbarkeit;
  label: string;
  description: string;
  icon: React.ElementType;
  activeClass: string;
  inactiveClass: string;
}> = [
  {
    value: "verfuegbar",
    label: "Verfügbar",
    description: "Neue Anfragen willkommen",
    icon: CheckCircle2,
    activeClass: "border-green-500 bg-green-50 text-green-700 shadow-sm ring-1 ring-green-400",
    inactiveClass: "border-[--border] bg-[--card] text-[--muted-foreground] hover:border-green-300 hover:bg-green-50/50",
  },
  {
    value: "eingeschraenkt",
    label: "Eingeschränkt",
    description: "Begrenzte Kapazität",
    icon: AlertCircle,
    activeClass: "border-amber-500 bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-400",
    inactiveClass: "border-[--border] bg-[--card] text-[--muted-foreground] hover:border-amber-300 hover:bg-amber-50/50",
  },
  {
    value: "ausgebucht",
    label: "Ausgebucht",
    description: "Keine freien Plätze",
    icon: XCircle,
    activeClass: "border-red-400 bg-red-50 text-red-700 shadow-sm ring-1 ring-red-400",
    inactiveClass: "border-[--border] bg-[--card] text-[--muted-foreground] hover:border-red-300 hover:bg-red-50/50",
  },
];

export function VerfuegbarkeitToggle({ anbieterId, initialVerfuegbarkeit }: Props) {
  const supabase = createClient();
  const [current, setCurrent] = useState<Verfuegbarkeit | null>(initialVerfuegbarkeit);
  const [saving, setSaving] = useState<Verfuegbarkeit | null>(null);

  const handleChange = async (newVal: Verfuegbarkeit) => {
    if (newVal === current || saving) return;
    setSaving(newVal);

    const { error } = await supabase
      .from("anbieter")
      .update({ verfuegbarkeit: newVal })
      .eq("id", anbieterId);

    if (error) {
      toast.error("Fehler beim Speichern der Verfügbarkeit");
    } else {
      setCurrent(newVal);
      const label = OPTIONS.find((o) => o.value === newVal)?.label ?? newVal;
      toast.success(`Verfügbarkeit auf „${label}" gesetzt`);
    }
    setSaving(null);
  };

  return (
    <div className="rounded-xl border border-[--border] bg-[--card] px-4 pt-3 pb-4 mb-6">
      <p className="text-xs font-semibold text-[--muted-foreground] uppercase tracking-wide mb-3">
        Verfügbarkeit
      </p>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => {
          const isActive = current === opt.value;
          const isLoading = saving === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => handleChange(opt.value)}
              disabled={saving !== null}
              className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 ${
                isActive ? opt.activeClass : opt.inactiveClass
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <opt.icon className="h-4 w-4 shrink-0" />
              )}
              <span className="text-xs font-semibold leading-tight">{opt.label}</span>
              <span className="text-[10px] leading-tight opacity-70 hidden sm:block">
                {opt.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

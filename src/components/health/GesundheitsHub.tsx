"use client";

import { useState } from "react";
import { Pill, Stethoscope, Syringe } from "lucide-react";
import { MedikamentenPlan } from "./MedikamentenPlan";
import { DiagnosenListe } from "./DiagnosenListe";
import { ImpfpassDigital } from "./ImpfpassDigital";

const TABS = [
  { id: "medikamente", label: "Medikamente", icon: Pill },
  { id: "diagnosen", label: "Diagnosen", icon: Stethoscope },
  { id: "impfungen", label: "Impfpass", icon: Syringe },
] as const;

type TabId = typeof TABS[number]["id"];

export function GesundheitsHub() {
  const [aktiv, setAktiv] = useState<TabId>("medikamente");

  return (
    <div className="space-y-6">
      {/* Tab-Navigation */}
      <div className="flex gap-1 p-1 bg-[--muted] rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAktiv(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              aktiv === tab.id
                ? "bg-[--background] text-[--foreground] shadow-sm"
                : "text-[--muted-foreground] hover:text-[--foreground]"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab-Inhalt */}
      <div>
        {aktiv === "medikamente" && <MedikamentenPlan />}
        {aktiv === "diagnosen" && <DiagnosenListe />}
        {aktiv === "impfungen" && <ImpfpassDigital />}
      </div>
    </div>
  );
}

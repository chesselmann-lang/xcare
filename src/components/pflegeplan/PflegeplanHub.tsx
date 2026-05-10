"use client";

import { useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  Target,
  BookOpen,
  Euro,
  Phone,
} from "lucide-react";
import { Terminkalender } from "./Terminkalender";
import { Aufgabenplan } from "./Aufgabenplan";
import { PflegezieleListe } from "./PflegezieleListe";
import { Pflegetagebuch } from "./Pflegetagebuch";
import { KostenUebersicht } from "./KostenUebersicht";
import { Notfallkontakte } from "./Notfallkontakte";

const TABS = [
  { id: "termine", label: "Termine", icon: CalendarDays },
  { id: "aufgaben", label: "Aufgaben", icon: ClipboardList },
  { id: "ziele", label: "Ziele", icon: Target },
  { id: "tagebuch", label: "Tagebuch", icon: BookOpen },
  { id: "kosten", label: "Kosten", icon: Euro },
  { id: "kontakte", label: "Kontakte", icon: Phone },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function PflegeplanHub() {
  const [aktiv, setAktiv] = useState<TabId>("termine");

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 p-1 bg-[--muted] rounded-xl w-fit min-w-full sm:min-w-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAktiv(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                aktiv === tab.id
                  ? "bg-[--background] text-[--foreground] shadow-sm"
                  : "text-[--muted-foreground] hover:text-[--foreground]"
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {aktiv === "termine" && <Terminkalender />}
        {aktiv === "aufgaben" && <Aufgabenplan />}
        {aktiv === "ziele" && <PflegezieleListe />}
        {aktiv === "tagebuch" && <Pflegetagebuch />}
        {aktiv === "kosten" && <KostenUebersicht />}
        {aktiv === "kontakte" && <Notfallkontakte />}
      </div>
    </div>
  );
}
